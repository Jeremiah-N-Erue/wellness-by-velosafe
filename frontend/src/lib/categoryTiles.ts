// Shared category tile data for Home and Discover. The 5 real wellness categories, each
// with its own photo — plus Wellness Shop, which isn't a bookable ServiceCategory (it's a
// product marketplace, not a session you book), so it's a fixed tile that routes to /shop
// instead of filtering providers.
export interface CategoryTile {
  slug: string;
  fallbackName: string;
  photo: string;
  isShop?: boolean;
}

export const CATEGORY_TILES: CategoryTile[] = [
  { slug: "pt", fallbackName: "Personal Training", photo: "/categories/pt.jpg" },
  { slug: "yoga-mindfulness", fallbackName: "Yoga & Mindfulness", photo: "/categories/yoga-mindfulness.jpg" },
  { slug: "wellness-coaching", fallbackName: "Wellness Coaching", photo: "/categories/wellness-coaching.jpg" },
  { slug: "fitness-classes", fallbackName: "Fitness Classes", photo: "/categories/fitness-classes.jpg" },
  { slug: "digital-programmes", fallbackName: "Digital Programmes", photo: "/categories/digital-programmes.jpg" },
  { slug: "shop", fallbackName: "Wellness Shop", photo: "/categories/wellness-shop.jpg", isShop: true },
];
