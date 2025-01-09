import type { LoaderFunction } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import {
  Badge,
  BlockStack,
  Card,
  InlineStack,
  Layout,
  Page,
  ResourceItem,
  ResourceList,
  Text,
  Thumbnail,
} from "@shopify/polaris";
import { authenticate } from "app/shopify.server";
import productImage from "../assets/no-product.png";

export const loader: LoaderFunction = async ({ params, request }) => {
  const { admin } = await authenticate.admin(request);
  const { id } = params;

  if (!id) {
    throw new Response("Collection ID is required", { status: 400 });
  }

  const collection = await prisma.collection.findUnique({
    where: { id },
    include: {
      products: {
        select: { productId: true },
      },
    },
  });

  if (!collection) {
    throw new Response("Collection not found", { status: 404 });
  }

  const productIds = collection.products.map((product) =>
    product.productId.split("/").pop(),
  );

  const productQuery = productIds.join(" OR ");

  const productsResponse = await admin.graphql(
    `#graphql
    query GetProducts($productQuery: String!) {
      products(first: 50, query: $productQuery) {
        edges {
          node {
            id
            media(first: 3) {
              edges {
                node {
                  preview {
                    image {
                      url(transform: { maxWidth: 100 })
                    }
                  }
                }
              }
            }
            priceRangeV2 {
              maxVariantPrice {
                amount
                currencyCode
              }
              minVariantPrice {
                amount
                currencyCode
              }
            }
            title
            variantsCount {
              count
            }
          }
        }
      }
    }`,
    {
      variables: {
        productQuery: productQuery,
      },
    },
  );

  const productsJson = await productsResponse.json();

  const products = productsJson.data.products.edges.map((edge: any) => ({
    id: edge.node.id,
    title: edge.node.title,
    images: edge.node.media.edges.map(
      (mediaEdge: any) => mediaEdge.node.preview.image.url,
    ),
    priceRange: {
      min: edge.node.priceRangeV2.minVariantPrice,
      max: edge.node.priceRangeV2.maxVariantPrice,
    },
    totalVariants: edge.node.variantsCount.count,
  }));

  return {
    collection: {
      id: collection.id,
      title: collection.name,
      priority: collection.priority,
    },
    products,
  };
};

const ViewSingleCollectionPage = () => {
  const { collection, products } = useLoaderData<CollectionResponseData>();

  return (
    <Page
      title={collection.title}
      backAction={{ content: "Back to Collections", url: "/app" }}
    >
      <Layout>
        {/* Collection Details */}
        <Layout.Section>
          <Card>
            <InlineStack gap={"500"} blockAlign="center">
              <Text as="p" variant="bodyMd" tone="subdued">
                Priority: <Badge tone="info">{collection.priority}</Badge>
              </Text>
              <Text as="p" variant="bodyMd" tone="subdued">
                Total Products: {products?.length}
              </Text>
            </InlineStack>
          </Card>
        </Layout.Section>

        {/* Products in Collection */}
        <Layout.Section>
          <Card>
            {products?.length > 0 ? (
              <ResourceList
                resourceName={{ singular: "product", plural: "products" }}
                items={products}
                renderItem={(item: ProductPayload) => {
                  const { id, title, priceRange, images, totalVariants } = item;
                  return (
                    <ResourceItem
                      id={id}
                      accessibilityLabel={`View details for ${title}`}
                      onClick={() => {}}
                    >
                      <InlineStack gap={"200"} blockAlign="center">
                        <Thumbnail
                          source={images[0] || productImage}
                          alt={title}
                        />
                        <BlockStack gap={"100"}>
                          <Text as="p" variant="bodyMd" fontWeight="bold">
                            {title}
                          </Text>
                          <Text as="p" variant="bodyMd" fontWeight="regular">
                            {priceRange.min.currencyCode +
                              priceRange.min.amount}{" "}
                            -{" "}
                            {priceRange.max.currencyCode +
                              priceRange.max.amount}
                          </Text>
                          <Text as="p" variant="bodyMd" fontWeight="regular">
                            Total Variants: {totalVariants}
                          </Text>
                        </BlockStack>
                      </InlineStack>
                    </ResourceItem>
                  );
                }}
              />
            ) : (
              <Card>
                <Text variant="bodyMd" tone="subdued" as="p">
                  No products added to this collection.
                </Text>
              </Card>
            )}
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
};

export default ViewSingleCollectionPage;
