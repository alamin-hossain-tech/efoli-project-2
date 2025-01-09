type CollectionProductPayload = {
  productId: string;
  name: string;
  image: string;
};

type CollectionFormData = {
  title: string;
  priority?: string;
  products: CollectionProductPayload[];
};

type Price = {
  currencyCode: string;
  amount: string;
};

type ProductPayload = {
  id: string;
  title: string;
  images: string[];
  priceRange: {
    min: Price;
    max: Price;
  };
  totalVariants: number;
};

type CollectionResponseData = {
  collection: {
    id: string;
    title: string;
    priority: string;
  };
  products: ProductPayload[];
};
