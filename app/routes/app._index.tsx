import type { Priority } from "@prisma/client";
import type { LoaderFunctionArgs } from "@remix-run/node";
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
import { EditIcon, SearchIcon, ViewIcon } from "@shopify/polaris-icons";
import _ from "lodash";
import { Suspense, useMemo, useState } from "react";

export const loader = ({ request }: LoaderFunctionArgs) => {
  const url = new URL(request.url);
  const search = url.searchParams.get("search") || "";
  const priority = (url.searchParams.get("priority") || "") as Priority;
  return prisma.collection.findMany({
    where: {
      name: { contains: search },
      ...(priority && { priority }),
    },
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

export default function Index() {
  const navigate = useNavigate();
  const collection = useLoaderData<typeof loader>();
  const [searchParams, setSearchParams] = useSearchParams();
  const [searchTerm, setSearchTerm] = useState(
    searchParams.get("search") || "",
  );
  const [priority, setPriority] = useState(searchParams.get("priority") || "");

  // Debounced handler for search text
  const debouncedSetSearchParams = useMemo(
    () =>
      _.debounce((value) => {
        setSearchParams((prev) => {
          const params = new URLSearchParams(prev);
          if (value) {
            params.set("search", value);
          } else {
            params.delete("search");
          }
          return params;
        });
      }, 300),
    [setSearchParams],
  );

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    debouncedSetSearchParams(value);
  };

  const handlePriorityChange = (value: string) => {
    setPriority(value);
    setSearchParams((prev) => {
      const params = new URLSearchParams(prev);
      if (value) {
        params.set("priority", value);
      } else {
        params.delete("priority");
      }
      return params;
    });
  };

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
                onChange={handleSearchChange}
                value={searchTerm}
                placeholder="Search collections..."
              />
            </div>
            <Select
              label="priority"
              labelHidden
              placeholder="Select priority"
              options={[
                { label: "All", value: "" },
                { label: "High", value: "HIGH" },
                { label: "Medium", value: "MEDIUM" },
                { label: "Low", value: "LOW" },
              ]}
              onChange={handlePriorityChange}
              value={priority}
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
                      <InlineStack align="end" gap={"100"}>
                        <Button icon={<Icon source={ViewIcon} />} />
                        <Button
                          onClick={() =>
                            navigate(`/app/edit-collection/${collection.id}`)
                          }
                          icon={<Icon source={EditIcon} />}
                        />
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
