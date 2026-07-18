import { z } from "zod";
import type { YonoteClient } from "./api-client.js";

export const COLLECTION_DOCUMENT_LIMIT = 1_000;
const COLLECTION_DOCUMENT_PAGE_SIZE = 100;

const collectionDocumentSchema = z.object({
  id: z.string(),
  title: z.string().optional().default(""),
  url: z.string().optional(),
  urlId: z.string().optional(),
  parentDocumentId: z.string().nullable().optional(),
  updatedAt: z.string().optional(),
  childrenCount: z.number().optional(),
});

const collectionDocumentPageSchema = z.object({
  data: z.array(collectionDocumentSchema),
  total: z.union([z.number(), z.string()]).optional(),
});

type CollectionDocument = z.infer<typeof collectionDocumentSchema>;

interface CollectionDocumentNode extends CollectionDocument {
  children: CollectionDocumentNode[];
}

export async function getCollectionDocuments(
  client: YonoteClient,
  collectionId: string,
  limit: number,
) {
  const documents: CollectionDocument[] = [];
  let offset = 0;
  let total: number | undefined;

  while (documents.length < limit) {
    const pageLimit = Math.min(
      COLLECTION_DOCUMENT_PAGE_SIZE,
      limit - documents.length,
    );
    const page = collectionDocumentPageSchema.parse(
      await client.request("documents.list", {
        collectionId,
        limit: pageLimit,
        offset,
      }),
    );
    documents.push(...page.data);
    offset += page.data.length;
    total = parseTotal(page.total) ?? total;

    if (page.data.length === 0) break;
    if (total !== undefined && offset >= total) break;
    if (total === undefined && page.data.length < pageLimit) break;
  }

  const knownTotal = total ?? documents.length;
  return {
    collectionId,
    total: knownTotal,
    returned: documents.length,
    truncated: documents.length < knownTotal,
    data: buildDocumentTree(documents),
  };
}

function parseTotal(total: number | string | undefined) {
  if (total === undefined) return undefined;
  const parsed = Number(total);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function buildDocumentTree(
  documents: CollectionDocument[],
): CollectionDocumentNode[] {
  const documentsById = new Map(
    documents.map((document) => [document.id, document]),
  );
  const documentIds = [...documentsById.keys()];
  const childrenByParent = new Map<string, string[]>();
  const rootIds: string[] = [];

  for (const id of documentIds) {
    const document = documentsById.get(id)!;
    const parentId = document.parentDocumentId;
    if (!parentId || !documentsById.has(parentId)) {
      rootIds.push(id);
      continue;
    }
    const children = childrenByParent.get(parentId) ?? [];
    children.push(id);
    childrenByParent.set(parentId, children);
  }

  const visited = new Set<string>();
  const buildNode = (id: string): CollectionDocumentNode | undefined => {
    if (visited.has(id)) return undefined;
    visited.add(id);
    const document = documentsById.get(id)!;
    const children = (childrenByParent.get(id) ?? [])
      .map(buildNode)
      .filter((child): child is CollectionDocumentNode => child !== undefined);
    return { ...document, children };
  };

  const roots = rootIds.map((id) => buildNode(id)!);
  for (const id of documentIds) {
    const node = buildNode(id);
    if (node) roots.push(node);
  }
  return roots;
}
