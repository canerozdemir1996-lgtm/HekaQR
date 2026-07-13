export type MenuItem = {
  id: string;
  name: string;
  description?: string;
  price?: string;
  image?: string;
  discountIds?: string[];
  calories?: string;
  protein?: string;
  carbs?: string;
  fat?: string;
  allergens?: string;
  preparationTime?: string;
  spicyLevel?: string;
  vegan?: boolean;
  vegetarian?: boolean;
  glutenFree?: boolean;
  isNew?: boolean;
  popular?: boolean;
  chefRecommended?: boolean;
};

export type MenuCategory = {
  id: string;
  name: string;
  image?: string;
  items: MenuItem[];
};

export type MenuTemplate = "hero" | "catalog" | "compact" | "premium";

export type MenuLogoMode = "hidden" | "small-left" | "center-large" | "floating";
export type MenuCategoryNavStyle = "hidden" | "chips" | "pills" | "round" | "compact";
export type MenuCategoryShowcase = "hidden" | "image" | "text" | "both";
export type MenuProductLayout = "image-top" | "image-left" | "image-right" | "image-round";

export type MenuVisibleProductInfo = {
  price?: boolean;
  description?: boolean;
  calories?: boolean;
  protein?: boolean;
  preparationTime?: boolean;
  spicyLevel?: boolean;
  vegan?: boolean;
  vegetarian?: boolean;
  glutenFree?: boolean;
  isNew?: boolean;
  popular?: boolean;
  chefRecommended?: boolean;
};

export type MenuDiscount = {
  id: string;
  name: string;
  type: "percent" | "amount";
  value: string;
  scope: "all" | "category" | "item";
  targetIds?: string[];
  startDate?: string;
  endDate?: string;
  active?: boolean;
};

export type MenuOrderItem = {
  id: string;
  categoryId: string;
  name: string;
  qty: number;
  price?: string;
  lineTotal: number;
};

export type MenuOrder = {
  id: string;
  tableNo: number;
  items: MenuOrderItem[];
  note?: string;
  subtotal: number;
  currency: string;
  status: "new" | "preparing" | "done" | "cancelled";
  createdAt: string;
  updatedAt?: string;
};

export type MenuData = {
  kind?: "menu";
  restaurantName: string;
  subtitle?: string;
  logo?: string;
  coverImage?: string;
  template?: MenuTemplate;
  logoMode?: MenuLogoMode;
  categoryNavStyle?: MenuCategoryNavStyle;
  categoryShowcase?: MenuCategoryShowcase;
  productLayout?: MenuProductLayout;
  theme: "classic" | "dark" | "fresh";
  backgroundColor?: string;
  tableCount?: number;
  ordersEnabled?: boolean;
  visibleProductInfo?: MenuVisibleProductInfo;
  orders?: MenuOrder[];
  currency: string;
  discounts?: MenuDiscount[];
  categories: MenuCategory[];
};

export const EMPTY_MENU_DATA: MenuData = {
  kind: "menu",
  restaurantName: "",
  subtitle: "",
  logo: "",
  coverImage: "",
  template: "hero",
  logoMode: "small-left",
  categoryNavStyle: "chips",
  categoryShowcase: "hidden",
  productLayout: "image-left",
  theme: "classic",
  backgroundColor: "#f8fafc",
  tableCount: 10,
  ordersEnabled: true,
  visibleProductInfo: {
    price: true,
    description: true,
    calories: true,
    protein: true,
    preparationTime: true,
    spicyLevel: true,
    vegan: true,
    vegetarian: true,
    glutenFree: true,
    isNew: true,
    popular: true,
    chefRecommended: true,
  },
  currency: "TL",
  discounts: [],
  categories: [
    {
      id: "cat-main",
      name: "Ana Yemekler",
      image: "",
      items: [
        {
          id: "item-main-1",
          name: "Ürün 1",
          description: "",
          price: "",
          image: "",
          discountIds: [],
          calories: "",
          protein: "",
          carbs: "",
          fat: "",
          allergens: "",
          preparationTime: "",
          spicyLevel: "",
          vegan: false,
          vegetarian: false,
          glutenFree: false,
          isNew: false,
          popular: false,
          chefRecommended: false,
        },
      ],
    },
  ],
};
