import type { ActionFunctionArgs } from "@remix-run/node";
import _ from "lodash";
import {
  Await,
  useLoaderData,
  useNavigate,
  useSearchParams,
} from "@remix-run/react";
import { TitleBar } from "@shopify/app-bridge-react";
import {
  Button,
  Card,
  Icon,
  IndexTable,
  InlineStack,
  Page,
  Select,
  Text,
  TextField,
} from "@shopify/polaris";
import { DeleteIcon, SearchIcon } from "@shopify/polaris-icons";
import { Suspense } from "react";
import { authenticate } from "../shopify.server";

export const loader = () => {
  return prisma.collection.findMany({
    select: {
      id: true,
      name: true,
      priority: true,
      products: true,
    },
    orderBy: {
      createdAt: "asc",
    },
  });
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { admin } = await authenticate.admin(request);
  const color = ["Red", "Orange", "Yellow", "Green"][
    Math.floor(Math.random() * 4)
  ];
  const response = await admin.graphql(
    `#graphql
      mutation populateProduct($product: ProductCreateInput!) {
        productCreate(product: $product) {
          product {
            id
            title
            handle
            status
            variants(first: 10) {
              edges {
                node {
                  id
                  price
                  barcode
                  createdAt
                }
              }
            }
          }
        }
      }`,
    {
      variables: {
        product: {
          title: `${color} Snowboard`,
        },
      },
    },
  );
  const responseJson = await response.json();

  const product = responseJson.data!.productCreate!.product!;
  const variantId = product.variants.edges[0]!.node!.id!;

  const variantResponse = await admin.graphql(
    `#graphql
    mutation shopifyRemixTemplateUpdateVariant($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
      productVariantsBulkUpdate(productId: $productId, variants: $variants) {
        productVariants {
          id
          price
          barcode
          createdAt
        }
      }
    }`,
    {
      variables: {
        productId: product.id,
        variants: [{ id: variantId, price: "100.00" }],
      },
    },
  );

  const variantResponseJson = await variantResponse.json();

  return {
    product: responseJson!.data!.productCreate!.product,
    variant:
      variantResponseJson!.data!.productVariantsBulkUpdate!.productVariants,
  };
};

export default function Index() {
  const navigate = useNavigate();
  const collection = useLoaderData<typeof loader>();
  const [searchParams, setSearchParams] = useSearchParams();

  return (
    <Page>
      <TitleBar title="Collections App">
        <button
          variant="primary"
          onClick={() => navigate("/app/create-collection")}
        >
          Create Collection
        </button>
      </TitleBar>

      <Card padding={"0"}>
        <div style={{ paddingBlock: 12, paddingInline: 16 }}>
          <InlineStack gap={"200"}>
            <div style={{ minWidth: "40%" }}>
              <TextField
                label="Search"
                labelHidden
                autoComplete="off"
                prefix={<Icon source={SearchIcon} />}
              />
            </div>
            <Select
              label="priority"
              labelHidden
              placeholder="Select priority"
              options={[
                { label: "High", value: "HIGH" },
                { label: "Medium", value: "MEDIUM" },
                { label: "Low", value: "LOW" },
              ]}
            />
          </InlineStack>
        </div>
        <IndexTable
          resourceName={{ singular: "Collection", plural: "Collections" }}
          itemCount={collection.length}
          headings={[
            { title: "Title" },
            { title: "Priority" },
            { title: "Products" },
            { title: "Action", alignment: "end" },
          ]}
          selectable={false}
        >
          <Suspense fallback={<div>Loading...</div>}>
            <Await resolve={collection}>
              {(data) =>
                data.map((collection, index) => (
                  <IndexTable.Row
                    id={collection.id}
                    key={collection.id}
                    position={index}
                  >
                    <IndexTable.Cell>
                      <Text variant="bodyMd" fontWeight="bold" as="span">
                        {collection.name}
                      </Text>
                    </IndexTable.Cell>
                    <IndexTable.Cell>{collection.priority}</IndexTable.Cell>
                    <IndexTable.Cell>
                      {collection.products.length}
                    </IndexTable.Cell>

                    <IndexTable.Cell>
                      <InlineStack align="end">
                        <Button icon={<Icon source={DeleteIcon} />} />
                      </InlineStack>
                    </IndexTable.Cell>
                  </IndexTable.Row>
                ))
              }
            </Await>
          </Suspense>
        </IndexTable>
      </Card>
    </Page>
  );
}
