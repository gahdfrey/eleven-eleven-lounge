import "dotenv/config";
import postgres from "postgres";

/**
 * Adds a starter lounge menu: categories and items with prices and opening stock.
 * Safe to run more than once: categories and items that already exist (matched
 * by name, ignoring case) are left exactly as they are.
 *
 *   npm run db:seed-menu
 *
 * Bottled and packaged items track stock (opening stock is written to the stock
 * ledger as a restock). Made-to-order things (cocktails, shots poured from
 * bottles, food, shisha) don't track stock.
 */
const N = (naira) => naira * 100; // prices are stored in kobo

const MENU = [
  {
    category: "Beer",
    trackStock: true,
    items: [
      ["Star Lager", 1500, 120],
      ["Gulder", 1500, 96],
      ["Heineken", 2000, 120],
      ["Trophy", 1300, 72],
      ["Hero", 1300, 72],
      ["Guinness Foreign Extra Stout", 2000, 96],
      ["Budweiser", 2000, 72],
      ["Desperados", 2500, 48],
    ],
  },
  {
    category: "Spirits",
    trackStock: true,
    items: [
      ["Hennessy VS (bottle)", 85000, 12],
      ["Hennessy VSOP (bottle)", 130000, 8],
      ["Jameson Irish Whiskey (bottle)", 45000, 12],
      ["Johnnie Walker Black Label (bottle)", 60000, 10],
      ["Glenfiddich 12 (bottle)", 90000, 6],
      ["Jack Daniel's (bottle)", 55000, 10],
      ["Absolut Vodka (bottle)", 35000, 10],
      ["Don Julio Blanco (bottle)", 120000, 6],
      ["Bacardi Carta Blanca (bottle)", 30000, 8],
      ["Martell VS (bottle)", 80000, 8],
    ],
  },
  {
    category: "Champagne & Wine",
    trackStock: true,
    items: [
      ["Moët & Chandon Impérial", 150000, 12],
      ["Moët Nectar Impérial Rosé", 180000, 6],
      ["Veuve Clicquot Brut", 170000, 6],
      ["Ace of Spades (Armand de Brignac)", 950000, 2],
      ["Belaire Rosé", 70000, 12],
      ["Carlo Rossi Red", 15000, 12],
      ["Four Cousins Sweet Rosé", 12000, 12],
    ],
  },
  {
    category: "Shots",
    trackStock: false,
    items: [
      ["Tequila shot", 3000],
      ["Jameson shot", 3000],
      ["Hennessy shot", 4500],
      ["Jägermeister shot", 3500],
    ],
  },
  {
    category: "Cocktails",
    trackStock: false,
    items: [
      ["Chapman", 4000, "Classic Nigerian Chapman"],
      ["Mojito", 6000, "Rum, mint, lime, soda"],
      ["Long Island Iced Tea", 8000],
      ["Margarita", 7000, "Tequila, triple sec, lime"],
      ["Pina Colada", 7000, "Rum, coconut, pineapple"],
      ["Sex on the Beach", 7000],
      ["Virgin Mojito (mocktail)", 4000],
    ],
  },
  {
    category: "Soft Drinks",
    trackStock: true,
    items: [
      ["Coca-Cola", 800, 120],
      ["Fanta", 800, 120],
      ["Sprite", 800, 120],
      ["Schweppes Tonic", 1000, 48],
      ["Malt (Maltina)", 1000, 96],
      ["Bottled Water", 500, 200],
      ["Red Bull", 2500, 72],
      ["Chivita Juice (1L)", 3000, 24],
    ],
  },
  {
    category: "Small Chops & Grills",
    trackStock: false,
    items: [
      ["Small Chops Platter", 8000, "Puff-puff, samosa, spring rolls, gizzard"],
      ["Peppered Gizzard", 5000],
      ["Asun (Spicy Goat Meat)", 7000],
      ["Suya (Beef)", 5000],
      ["Chicken Wings (6 pcs)", 6500],
      ["Grilled Fish (Croaker)", 15000, "With chips or plantain"],
      ["Peppered Snail", 9000],
    ],
  },
  {
    category: "Main Meals",
    trackStock: false,
    items: [
      ["Jollof Rice & Chicken", 7000],
      ["Fried Rice & Chicken", 7000],
      ["Pepper Soup (Goat)", 6000],
      ["Pepper Soup (Catfish)", 8000],
      ["Chips & Chicken", 6500],
    ],
  },
  {
    category: "Shisha",
    trackStock: false,
    items: [
      ["Shisha (Single Flavour)", 15000, "Double apple, mint, grape or watermelon"],
      ["Shisha (Mixed Flavour)", 18000],
      ["Shisha Refill", 7000],
    ],
  },
];

const url = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
if (!url) {
  console.error("[seed-menu] DATABASE_URL is not set.");
  process.exit(1);
}
const sql = postgres(url, { max: 1, prepare: false, onnotice: () => {} });

let addedCats = 0;
let addedItems = 0;
try {
  await sql.begin(async (tx) => {
    const [{ admin } = {}] = await tx`select id as admin from users where role = 'admin' and deleted_at is null order by id limit 1`;
    const [{ maxSort }] = await tx`select coalesce(max(sort_order), 0)::int as "maxSort" from categories where deleted_at is null`;
    let sort = maxSort;

    for (const group of MENU) {
      let [cat] = await tx`select id from categories where lower(name) = lower(${group.category}) and deleted_at is null limit 1`;
      if (!cat) {
        [cat] = await tx`insert into categories (name, sort_order) values (${group.category}, ${++sort}) returning id`;
        addedCats++;
      }
      for (const [name, price, third] of group.items) {
        const stock = group.trackStock ? third : 0;
        const description = group.trackStock ? null : (third ?? null);
        const [exists] = await tx`select id from products where lower(name) = lower(${name}) and deleted_at is null limit 1`;
        if (exists) continue;
        const [p] = await tx`
          insert into products (category_id, name, description, price, track_stock, stock_qty, low_stock_at)
          values (${cat.id}, ${name}, ${description}, ${N(price)}, ${group.trackStock}, ${stock}, ${group.trackStock ? Math.max(2, Math.ceil(stock / 6)) : 0})
          returning id`;
        if (group.trackStock && stock > 0) {
          await tx`
            insert into stock_movements (product_id, change, balance_after, reason, user_id, note)
            values (${p.id}, ${stock}, ${stock}, 'restock', ${admin ?? null}, 'Opening stock')`;
        }
        addedItems++;
      }
    }
  });
  console.log(`[seed-menu] Added ${addedCats} categor${addedCats === 1 ? "y" : "ies"} and ${addedItems} item(s). Existing ones were left unchanged.`);
} finally {
  await sql.end();
}
