import {
  useActionData,
  useNavigate,
  useNavigation,
  useSubmit,
} from "@remix-run/react";
import { useAppBridge } from "@shopify/app-bridge-react";
import {
  BlockStack,
  Button,
  Card,
  Divider,
  EmptyState,
  Icon,
  Image,
  InlineStack,
  Layout,
  Page,
  Select,
  Text,
  TextField,
} from "@shopify/polaris";
import { DeleteIcon, SearchIcon } from "@shopify/polaris-icons";
import { Controller, useForm } from "react-hook-form";

import type { Priority } from "@prisma/client";
import type { ActionFunctionArgs } from "@remix-run/node";
import { useEffect } from "react";
import productImage from "../assets/no-product.png";

type ProductPayload = {
  productId: string;
  name: string;
  image: string;
};

type CollectionFormData = {
  title: string;
  priority?: string;
  products: ProductPayload[];
};

const CreateCollectionPage = () => {
  const navigate = useNavigate();
  const shopify = useAppBridge();

  const {
    handleSubmit,
    control,
    setValue,
    watch,
    formState: { errors },
    reset,
  } = useForm<CollectionFormData>({
    defaultValues: {
      title: "",
      priority: undefined,
      products: [],
    },
  });
  const products = watch("products");
  const submit = useSubmit();
  const onSubmit = (data: CollectionFormData) => {
    if (products.length < 1) {
      shopify.toast.show("At least 1 Product need to add", { isError: true });
    } else {
      submit(data, { method: "post", encType: "application/json" });
    }
  };

  const onSearchProduct = async (query?: string) => {
    const selected: any = await shopify.resourcePicker({
      type: "product",
      multiple: true,
      action: "select",
      // query: query || "",
      selectionIds: products?.map((p) => ({ id: p.productId })),
    });

    setValue(
      "products",
      selected?.map((p: any) => ({
        name: p.title,
        productId: p.id,
        image: p?.images[0]?.originalSrc,
      })) || [],
    );
  };

  const navigation = useNavigation();
  const isSubmitting = navigation.state === "submitting";
  const actionData = useActionData<any>();
  useEffect(() => {
    if (actionData) {
      if (actionData?.error) {
        shopify.toast.show(actionData?.error, { isError: true });
      } else if (actionData.success) {
        shopify.toast.show("Collection Create Success");
        reset();
      }
    }
  }, [actionData, reset, shopify.toast]);

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <Page
        title="Create Collection"
        backAction={{ onAction: () => navigate(-1) }}
        primaryAction={
          <Button submit variant="primary" loading={isSubmitting}>
            Save
          </Button>
        }
      >
        <BlockStack gap={"300"}>
          <Card>
            <Layout>
              <Layout.Section variant="oneHalf">
                <Controller
                  name="title"
                  control={control}
                  rules={{
                    required: "Collection title is required",
                    minLength: {
                      value: 3,
                      message: "Title must be at least 3 characters long",
                    },
                  }}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      onChange={(e) => field.onChange(e)}
                      label="Collection Title"
                      error={errors.title?.message}
                      autoComplete="off"
                    />
                  )}
                />
              </Layout.Section>
              <Layout.Section variant="oneThird">
                <Controller
                  control={control}
                  name="priority"
                  rules={{ required: "Priority is required" }}
                  render={({ field }) => (
                    <Select
                      {...field}
                      onChange={(e) => field.onChange(e)}
                      label="Select Priority"
                      placeholder="Select a priority"
                      options={[
                        { label: "High", value: "HIGH" },
                        { label: "Medium", value: "MEDIUM" },
                        { label: "Low", value: "LOW" },
                      ]}
                      error={errors.priority?.message}
                    />
                  )}
                />
              </Layout.Section>
            </Layout>
          </Card>
          <Card>
            <Layout>
              <Layout.Section variant="oneHalf">
                {/* Search Field */}
                <InlineStack
                  align="start"
                  gap={"200"}
                  blockAlign="end"
                  wrap={false}
                >
                  <div style={{ minWidth: "50%" }}>
                    <TextField
                      label="Products"
                      placeholder="Search for a product..."
                      autoComplete="off"
                      prefix={<Icon source={SearchIcon} />}
                      onChange={(e) => {
                        onSearchProduct(e);
                      }}
                    />
                  </div>
                  {/* Browse Button */}
                  <Button size="large" onClick={onSearchProduct}>
                    Browse
                  </Button>
                </InlineStack>
              </Layout.Section>

              <Layout.Section variant="fullWidth">
                {products.length > 0 ? (
                  <BlockStack gap={"200"}>
                    {products.map((p) => (
                      <BlockStack gap={"200"} key={p.productId}>
                        <InlineStack key={p.productId} align="space-between">
                          <InlineStack blockAlign="center" gap={"100"}>
                            <Image
                              width={"40px"}
                              height={"40px"}
                              style={{
                                objectFit: "cover",
                                borderRadius: "4px",
                                objectPosition: "top",
                              }}
                              source={p.image || productImage}
                              alt={p.name}
                            />
                            <Text as="p">{p.name}</Text>
                          </InlineStack>
                          <Button
                            variant="plain"
                            tone="critical"
                            icon={<Icon tone="critical" source={DeleteIcon} />}
                          />
                        </InlineStack>
                        <Divider />
                      </BlockStack>
                    ))}
                  </BlockStack>
                ) : (
                  <EmptyState
                    image=""
                    // image={
                    //   "https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
                    // }
                    imageContained={true}
                    heading="There are no products in this collection."
                  >
                    Search or browse to add products
                  </EmptyState>
                )}
              </Layout.Section>
            </Layout>
          </Card>
        </BlockStack>
      </Page>
    </form>
  );
};

export default CreateCollectionPage;

export async function action({ request }: ActionFunctionArgs) {
  const data = await request.json();

  const title = data.title;
  const priority = data.priority as Priority;
  const products = data.products;

  if (!title || !priority || !products) {
    return { error: "Missing required fields" };
  }

  try {
    await prisma.collection.create({
      data: {
        name: title,
        priority,
        products: {
          create: products.map((p: any) => ({
            productId: p.productId,
            name: p.name,
          })),
        },
      },
    });

    return { success: true };
  } catch (error) {
    console.error("Prisma insertion error:", error);
    return { error: "Failed to save data" };
  }
}
