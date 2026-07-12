export type Product = {
  id: string;
  name: string;
  category: string;
  groupId?: string;
  price: number;
  image: string;
  accent: string;
  description: string;
  stock: number;
  status: "Active" | "Low stock" | "Draft";
  featured: boolean;
};

export type Category = {
  id: string;
  name: string;
  description: string;
  image: string;
  sortOrder: number;
};

export type ProductGroup = {
  id: string;
  name: string;
  description: string;
  image: string;
  sortOrder: number;
};

export type Customer = {
  id: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  club: string;
  createdAt: string;
  passwordHash?: string;
  resetToken?: string;
  resetExpiresAt?: string;
};

export type OrderItem = {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
};

export type Order = {
  id: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  status: "Quote sent" | "Confirmed" | "Packed" | "Shipped" | "Delivered";
  trackingNumber: string;
  carrier: string;
  eta: string;
  total: number;
  createdAt: string;
  items: OrderItem[];
};

export type AdminUser = {
  id: string;
  username: string;
  passwordHash?: string;
  createdAt: string;
};

export const starterCategories: Category[] = [
  {
    id: "bats",
    name: "Bats",
    description: "Match and training bats for club cricket.",
    image: "/cricket-central-logo.png",
    sortOrder: 1,
  },
  {
    id: "apparel",
    name: "Apparel",
    description: "Jerseys and teamwear.",
    image: "/cricket-central-logo.png",
    sortOrder: 2,
  },
  {
    id: "caps",
    name: "Caps",
    description: "Club caps and fan caps.",
    image: "/cricket-central-logo.png",
    sortOrder: 3,
  },
  {
    id: "kits",
    name: "Kits",
    description: "Practice kits and starter bundles.",
    image: "https://images.unsplash.com/photo-1531415074968-036ba1b575da?auto=format&fit=crop&w=900&q=80",
    sortOrder: 4,
  },
  {
    id: "accessories",
    name: "Accessories",
    description: "Gloves, grips, balls, and add-ons.",
    image: "https://images.unsplash.com/photo-1624526267942-ab0ff8a3e972?auto=format&fit=crop&w=900&q=80",
    sortOrder: 5,
  },
];

export const starterGroups: ProductGroup[] = [
  {
    id: "match-day",
    name: "Match Day Essentials",
    description: "Core gear for game day orders.",
    image: "/cricket-central-logo.png",
    sortOrder: 1,
  },
  {
    id: "training",
    name: "Training Bundle",
    description: "Practice gear for players and clubs.",
    image: "https://images.unsplash.com/photo-1531415074968-036ba1b575da?auto=format&fit=crop&w=900&q=80",
    sortOrder: 2,
  },
];

export const categories = ["All", ...starterCategories.map((category) => category.name)];

export const starterProducts: Product[] = [
  {
    id: "signature-bat",
    name: "Cricket Central Signature Bat",
    category: "Bats",
    groupId: "match-day",
    price: 149,
    image: "/cricket-central-logo.png",
    accent: "#c91524",
    description: "Match-ready willow profile with Cricket Central branding.",
    stock: 18,
    status: "Active",
    featured: true,
  },
  {
    id: "club-jersey",
    name: "Central Match Jersey",
    category: "Apparel",
    groupId: "match-day",
    price: 48,
    image: "/cricket-central-logo.png",
    accent: "#0d2445",
    description: "Lightweight cricket jersey with navy, white, and red trim.",
    stock: 64,
    status: "Active",
    featured: true,
  },
  {
    id: "club-cap",
    name: "Central Club Cap",
    category: "Caps",
    groupId: "match-day",
    price: 26,
    image: "/cricket-central-logo.png",
    accent: "#10294c",
    description: "Structured navy cap with embroidered Cricket Central mark.",
    stock: 11,
    status: "Low stock",
    featured: true,
  },
  {
    id: "training-kit",
    name: "Starter Training Kit",
    category: "Kits",
    groupId: "training",
    price: 86,
    image:
      "https://images.unsplash.com/photo-1531415074968-036ba1b575da?auto=format&fit=crop&w=900&q=80",
    accent: "#3454d1",
    description: "Practice ball, grip tape, training cones, and kit bag.",
    stock: 22,
    status: "Active",
    featured: false,
  },
  {
    id: "batting-gloves",
    name: "Pro Batting Gloves",
    category: "Accessories",
    groupId: "training",
    price: 42,
    image:
      "https://images.unsplash.com/photo-1624526267942-ab0ff8a3e972?auto=format&fit=crop&w=900&q=80",
    accent: "#d3a036",
    description: "Flexible protection and confident grip for long innings.",
    stock: 9,
    status: "Low stock",
    featured: false,
  },
];

export const starterOrders: Order[] = [
  {
    id: "CC-1048",
    customerId: "cust-1",
    customerName: "Aarav Patel",
    customerEmail: "aarav@example.com",
    status: "Shipped",
    trackingNumber: "CCX93820481",
    carrier: "UPS",
    eta: "Jul 15, 2026",
    total: 245,
    createdAt: "2026-07-10",
    items: [
      {
        productId: "signature-bat",
        productName: "Cricket Central Signature Bat",
        quantity: 1,
        price: 149,
      },
      {
        productId: "club-jersey",
        productName: "Central Match Jersey",
        quantity: 2,
        price: 48,
      },
    ],
  },
  {
    id: "CC-1049",
    customerId: "cust-2",
    customerName: "Maya Singh",
    customerEmail: "maya@example.com",
    status: "Packed",
    trackingNumber: "Packing now",
    carrier: "Cricket Central",
    eta: "Jul 14, 2026",
    total: 112,
    createdAt: "2026-07-11",
    items: [
      {
        productId: "club-cap",
        productName: "Central Club Cap",
        quantity: 1,
        price: 26,
      },
      {
        productId: "training-kit",
        productName: "Starter Training Kit",
        quantity: 1,
        price: 86,
      },
    ],
  },
];
