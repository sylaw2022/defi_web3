# Next.js & Frontend Architecture Q&A

## 1. Core Concepts: Next.js vs Vite

### Q: How much change is needed to convert from Vite to Next.js?
**A:** The conversion is relatively straightforward for SPAs:
1.  **Dependencies**: Swap `vite` for `next`.
2.  **Routing**: Move from `src/*` to `app/*` (File-based routing).
3.  **Entry Point**: `index.html` becomes `app/layout.js`. `App.jsx` becomes `app/page.js`.
4.  **Client Logic**: Add `'use client'` to components using hooks (`useState`, `useEffect`, `wagmi`).

### Q: Why do I need `'use client'`?
**A:** In Next.js App Router, all components are **Server Components** by default (no hooks, no browser APIs).
- Adding `'use client'` at the top opts a component into the traditional React behavior (running in the browser), which is required for wallet connections and interactivity.

### Q: Is Next.js an SPA?
**A:** **Yes.**
- **Initial Load**: It acts like a traditional website (sends HTML) for speed and SEO.
- **Navigation**: It acts like an SPA. When you click `<Link>`, it fetches JSON data and updates the DOM without a full page reload.

## 2. Bundlers: Webpack vs Turbopack

### Q: What is the difference between Webpack and Turbopack?
- **Webpack**: The industry-standard bundler for the last decade. Powerful and flexible ecosystem, but written in JavaScript, making it slower for large projects.
- **Turbopack**: The successor built by the Next.js team using Rust. It is significantly faster (incremental architecture) but newer and has fewer plugins.
- **Usage**:
    - **Development (`next dev`)**: Defaults to **Turbopack** (Fast ⚡).
    - **Production (`next build`)**: Defaults to **Webpack** (Stable 🛡️). You can opt-into Turbopack for builds with `next build --turbo` (Experimental).

### Q: Why is Turbopack faster?
**A:** It creates a dependency graph of your functions. When you change a file, it only re-executes the specific functions affected by that change (**Incremental Computation**), rather than re-bundling the whole file or module.

### Q: What does "Parsing & Compiling" actually do?
**A:** This is the heavy work that bundlers do:
1.  **Parsing (Lexical Analysis)**: Reads your text code (`const x = 1`) and converts it into a tree structure called an **AST (Abstract Syntax Tree)** so the computer understands it.
2.  **Transforming (Compiling)**: Takes the AST and changes it (e.g., converts modern TypeScript to older JavaScript, or JSX to `React.createElement`).
3.  **Generating**: Turns the modified AST back into a JavaScript string for the browser.
**Turbopack is fast because it skips steps 1-3 for code that hasn't changed.**

### Q: What changes if I use Webpack for development?
- **Slower Startup**: The dev server will take longer to start (seconds vs milliseconds).
- **Slower Updates**: Hot Module Replacement (HMR) gets slower as your app grows with Webpack, whereas Turbopack stays fast instantly.
- **Why use it?**: You might switch back to Webpack (using `next dev --webpack`) if you rely on a very specific, older custom Babel plugin or loader that Turbopack doesn't support yet.

## 3. Rendering & Bundling

### Q: Next.js production build has many files. Why?
**A:** This is **Code Splitting**.
- Instead of one massive `bundle.js` (Vite), Next.js splits code into chunks per page.
- Users only download the JavaScript needed for the specific page they are visiting (e.g., Home), not the whole app (e.g., Admin Dashboard).

### Q: What is `output: 'export'` (SSG)?
**A:** Static Site Generation.
- It builds your app into pure HTML/CSS/JS files (`out/` folder).
- **Pros**: Can be hosted anywhere (GitHub Pages, S3, IPFS). Faster. Cheaper.
- **Cons**: No Node.js server features (API Routes, Dynamic Headers).

### Q: Does SSG mean no JavaScript?
**A:** **No.**
- SSG sends **Pre-rendered HTML** (for instant visual) + **JavaScript** (for interactivity).
- This process is called **Hydration**.

### Q: What is the difference between SSG and SSR?
- **SSG**: HTML is generated **once** at build time (`npm run build`).
- **SSR**: HTML is generated **on every request** by a Node.js server.

### Q: When should I use SSG vs SSR?
**Use SSG (Static) when:**
- The content is the same for every user (e.g., Landing Page, Blog Post, Documentation).
- You want the fastest possible performance (served from CDN).
- You want cheap hosting (S3, GitHub Pages).

- **Use SSR (Server) when:**
- The content is different for every user (e.g., "Welcome, Sylaw!").
- You need access to request data (Cookies, Headers, IP address).
- The data changes every second (e.g., Live Stock Ticker) and SEO matters.

## 5. Security & Authentication

### Q: How does `Set-Cookie` actually work?
**It is a handshake between Server and Browser:**
1.  **Response Header**: When you log in, the server sends a response with a specific header:
    ```http
    HTTP/1.1 200 OK
    Set-Cookie: session_id=12345; HttpOnly; Secure; Path=/; SameSite=Strict
    ```
2.  **Browser Action**: The browser sees this header and thinks: *"Okay, I need to save 'session_id=12345' for this domain."*
3.  **Storage**: It saves it in an internal database (Cookie Jar) associated with `example.com`.
4.  **Future Requests**: Whenever you make *any* request to `example.com` (page load, API call, image fetch), the browser looks in the Cookie Jar, finds the cookie, and **automatically** adds a Request Header:
    ```http
    GET /admin HTTP/1.1
    Cookie: session_id=12345
    ```
**Key Concept**: The Frontend code (React/JavaScript) **does nothing**. It doesn't read the cookie, it doesn't set the header. The Browser handles it all automatically at the network layer.

### Q: Is the cookie just a random number (Session ID)?
**Usually, yes.** But there are two main approaches:
1.  **Stateful Session (Old School)**:
    - **Cookie**: `session_id=12345` (Just a random ID).
    - **Server**: Looks up ID `12345` in a database (Redis/SQL) to find `{ user: "Sylaw", role: "Admin" }`.
    - **Pros**: Easy to revoke (delete from DB). **Cons**: Server needs a database lookup for every request.
2.  **Stateless Session (JWT - Modern)**:
    - **Cookie**: `token=AppID.UserSylaw.RoleAdmin.Signature` (JSON Web Token).
    - **Server**: Decrypts/Verifies the signature mathematically. No database lookup needed.
    - **Pros**: Fast, scalable. **Cons**: Harder to revoke instantly.

### Q: Is Axios still the industry standard?
**It used to be, but things have changed:**
1.  **Axios (2015-2020)**: Dominant. Better syntax than `XMLHttpRequest`. Auto-JSON parsing. Interceptors.
2.  **Native Fetch (2020-Present)**: Now built into every browser and Node.js. No need to install a library. Next.js extends `fetch` with caching powers.
3.  **The New Standard**: **TanStack Query (React Query)** wrapping `fetch`.
    - Instead of `axios.get('/user')`, you use `useQuery({ queryKey: ['user'], queryFn: fetchUser })`.
    - Handles **Caching, Loading States, Deduplication, and Refetching** automatically.

### Q: Why do people say JWT is "modern" but large companies still use Sessions?
**The "Stateless" Myth:**
- **JWT** became popular because you don't need a database for sessions, which sounds great for microservices.
- **The Catch**: If you want to **Ban a User** or **Logout Everywhere**, you can't easily do it with a standard JWT because the token is valid until it expires (e.g., 1 hour).
- **The Reality**: To fix this, developers add a "Blacklist" database for revoked JWTs... which effectively turns it back into a Stateful Session!
- **Verdict**: For critical apps (Banking, Admin Panels), **Stateful Sessions (Redis)** are often preferred for security control. for high-scale, low-risk apps, **JWT** is fine.
- **Prevalence**: Yes, "Stateful Sessions" are still the standard for banking, healthcare, and enterprise apps (Facebook, Google, etc.). JWT is more popular for developer tools and mobile apps.

### Q: How does Redis work?
**Simple Concept**: It's a database that lives in **RAM (Memory)**, not on the Hard Drive (Disk).
- **Speed**: Reading from RAM is ~100,000x faster than reading from Disk.
- **Structure**: It's a giant JSON object (Key-Value Store):
    ```json
    { "session_123": "{ user: 'Sylaw', expiry: '10:00' }" }
    ```
- **TTL (Time To Live)**: You can tell Redis: *"Save this key for 60 seconds, then delete it automatically."*
- **Autonomous Deletion**: Once you set a TTL, Redis handles the monitoring and deletion entirely on its own. It uses two methods:
    1. **Passive**: When someone tries to `GET` a key, Redis checks if it's expired and deletes it if so.
    2. **Active**: Every 100ms, Redis scans a random sample of keys with a TTL and deletes any that have expired to free up memory.
- **Risk**: Since it's in RAM, if the server power cuts, you lose data. (Though modern Redis saves snapshots to disk occasionally). This is why we use it for *temporary* data (Sessions), not *permanent* data (User Accounts).

### Q: Why do I need separate Redis "Infrastructure" (instead of just running it on my app server)?
**For Production, you want Redis on its own "Island" because:**
1.  **Persistence across App Restarts**: Every time you update your code and restart your Web Server, the local memory clears. If Redis is separate, your users stay logged in even while you are updating the website.
2.  **Multi-Server Scaling**: If your app gets popular and you run **3 Web Servers** to handle the traffic, they all need to talk to the **same central Redis**. If each server had its own local Redis, users would get "Logged Out" randomly depending on which server they hit.
3.  **Dedicated RAM**: Redis is memory-hungry. If your Web Server leaks memory or crashes, a separate Redis machine stays healthy.

### Q: Does Redis use a "Reverse Proxy" for Load Balancing?
**Not exactly.** It’s more like a "Star" shape:

1.  **The Entry Way (Reverse Proxy)**: You use a Load Balancer (like Nginx or AWS ALB) to send incoming users to different **Web Servers**.
2.  **The Hub (Redis)**: All those Web Servers then connect to **one central Redis instance**.

**Why the difference?**
- **Web Servers** are "Stateless" – any server can handle any user.
- **Redis** is "Stateful" – it holds the actual data. If you load-balanced Redis into 3 different machines without a sync mechanism, Server-A wouldn't find the session stored in Redis-B.

For massive apps, we use **Redis Cluster**, where data is split (sharded) across multiple machines, but the **Redis Client library** (like `ioredis`) is smart enough to know which machine has which data automatically.

### Q: Does every Redis server have the same data (Synchronization)?
**It depends on your strategy:**

1.  **Replication (Synchronization)**:
    - **How it works**: One **Master** and many **Slaves**. Every time you write to the Master, it copies that exact data to all Slaves.
    - **Why?**: If the Master dies, a Slave is ready with the *same state*. Also, you can read from Slaves to handle more traffic.
    - **Verdict**: Yes, these are synchronized to have the same state.

2.  **Sharding / Clustering (Divide & Conquer)**:
    - **How it works**: You have 10 servers. Data is split. Server 1 handles users A-D, Server 2 handles E-H, etc.
    - **Hash Slots**: Redis Cluster uses exactly **16,384 Hash Slots**. Every key (like `session:123`) is mathematically hashed to a number between 0 and 16383. Each Master node is responsible for a range of these slots.
    - **Routing**: The **Redis Client library** (like `ioredis`) in your code is "Smart". When it starts, it downloads the map of all nodes and slots. When you run `redis.set("session:123")`, the library:
        1. Hashes the key to find the slot number.
        2. Checks its map to see: "Slot 500 is owned by Redis-Server-B."
        3. Sends the data **directly** to Server-B.
    - **Uniform Distribution**: Redis uses the **CRC16** algorithm. This ensures that random keys (like Session IDs) are spread perfectly and evenly across all 16,384 slots. You won't get a "busy" slot if your keys are random.
    - **Hotkey Problem**: The real danger isn't one *slot* being busy; it's one **single key** being busy (e.g., a Global Configuration key used by every user). Millions of requests for one key will always hit one server.
    - **Why?**: When you have millions of users, "Syncing" everything to every server becomes too slow. 
    - **Verdict**: No, these are *not* synchronized to have the same state. They share the workload by holding different pieces of the puzzle.
    - **Reliability**: In production, **each Shard has its own Replicas.** So if the "Master" of Shard 1 fails, its own "Slave" takes over, ensuring those specific users aren't affected.

**For a typical DeFi app**: You almost always use **Replication**. You don't have enough session data to need sharding, but you definitely need the "Sync" for safety.

### Q: Does a Central Redis cause a Single Point of Failure (SPOF)?
**Yes, it would if it were just one machine.** In production, we prevent this using **High Availability (HA)** strategies:
1.  **Replication (Master-Slave)**: Every write to the Master is instantly copied to one or more "Slaves".
2.  **Redis Sentinel (Failover Manager)**: A group of "guards" that monitor the Master. If it crashes, they automatically promote a Slave to be the new Master.
3.  **Redis Cluster**: Data is split across multiple Masters. If one node dies, the others stay up, and only a fraction of the data is temporarily unavailable.

**Most developers don't build this themselves**—they pay for "Managed Redis" (AWS ElastiCache, Upstash) where the provider handles the failover and multiple servers automatically.

### Q: What is the Login Workflow with Redis + SQL?
1.  **Request**: User sends `POST /api/login` with `{ username, password }`.
2.  **Verification**: Server checks **SQL Database**: "Does this password hash match the user table?"
3.  **Creation**: If yes, the **Web Server (Next.js)** generates a random, secure Session ID (e.g., `123`). Redis does NOT generate the ID; your code does.
4.  **Storage**: Server calls **Redis**: `SET session:123 "User:Sylaw" EX 3600`.
5.  **Response**: Server sends `Set-Cookie: session_id=123`.

**Subsequent Requests**:
- User sends `Cookie: session_id=123`.
- Server checks **Redis**: `GET session:123`. (It skips SQL entirely).
- If found, request proceeds. Fast!

### Q: How does the server connect to Redis?
**Through a Client Library (NPM Package):**
1.  **Install**: `npm install ioredis` (or `@redis/client`).
2.  **Import**: In your `route.js`:
    ```javascript
    import Redis from 'ioredis';
    // For a single server:
    const redis = new Redis("redis://localhost:6379");
    
    // For a Cluster (Multiple Nodes):
    const cluster = new Redis.Cluster([
      { host: "10.0.0.1", port: 6379 }, // Seed Node 1
      { host: "10.0.0.2", port: 6379 }  // Seed Node 2
    ]);
    ```

### Q: In a Cluster, which server do I connect to first?
**You use "Seed Nodes" (Entry Points):**
1.  **The Bootstrap**: You provide the client with the IP of one or more nodes (Seed Nodes).
2.  **The Discovery**: The client connects to *any* of those seeds and says: *"Show me the whole family."*
3.  **The Map**: That node responds with the full map of every node in the cluster and their assigned slots.
4.  **The Expansion**: The smart client automatically connects to all other nodes in the background.

**Verdict**: You can connect to **any** node to start; the cluster is smart enough to introduce you to all the other members automatically.

**It connects over TCP**, just like connecting to a SQL database or an API.

### Q: How does the "HttpOnly Cookie" flow work for secure admin panels?
**The Flow:**
1.  **Login**: User types password & clicks "Login" -> Sends POST request to `/api/login`.
2.  **Verify**: Server checks password. If correct, it generates a Session ID.
3.  **Set-Cookie**: Server responds with `Set-Cookie: session_id=xyz; HttpOnly; Secure`.
4.  **Browser**: The Browser receives this header and stores the cookie in a special "secure vault". **JavaScript (`document.cookie`) cannot see it.**
5.  **Request**: User navigates to `/admin`. Browser automatically attaches `Cookie: session_id=xyz`.
6.  **SSR Check**: Server (Next.js) receives request + cookie. Checks if `xyz` is an Admin.
7.  **Render**: If yes, Server generates `<AdminPanel>` HTML. If no, it generates `403 Forbidden` HTML.

*(Note: In DeFi dApps, we often use SSG because user data comes from the Wallet (Client-Side), not the Server.)*

## 4. Routing

### Q: How does Routing work?
- **File-Based Routing**: Folders determine URLs.
- **`app/about/page.js`** -> `example.com/about`
- **`app/api/user/route.js`** -> `example.com/api/user`

### Q: `<Link>` vs `<a>` tag?
- **`<Link href="...">`**: Client-side navigation. Fetches JSON data. Fast. No reload.
- **`<a href="...">`**: Browser navigation. Fetches full HTML. Causes full page reload (destroy & rebuild DOM).

### Q: Does `layout.js` reload on navigation?
**A:** **No.**
- The Layout (Navbar/Sidebar) preserves state. Only the `{children}` (Page content) is swapped out during navigation.

## 6. Backend & Relayers

### Q: When do I need a Backend API in DeFi?
**A:** You *don't* need it for standard transactions (Deposit/Withdraw are direct to blockchain).
**You DO need it for:**
1.  **Data Indexing**: Storing history, charts, user profiles.
2.  **Secrets**: Hiding API keys (e.g., CoinGecko).
3.  **Relayers**: Gasless transactions.

### Q: How does a Relayer work?
**A:**
1.  **Standard Write**: User signs -> User Pays Gas -> Blockchain.
2.  **Relayer Write**: User calls API -> Server Signs -> **Server Pays Gas** -> Blockchain.

### Q: Why use Relayers if someone still has to pay gas?
**A:** **User Experience (UX)**.
- It allows "Gasless" onboarding (User doesn't need ETH).
- Users can pay in other tokens (USDC) or via Credit Card (Paymasters).

## 6. Next.js Internals & .next Folder

### Q: What is inside the `.next` folder?
**A:** It is the build output directory.
- **`.next/server`**: Contains logic that runs on the server (SSR, API Routes).
- **`.next/static`**: Contains logic sent to the browser (Client Components, CSS, Images).
- **`chunks/`**: Shared code split into small files to optimize loading.
- **`build-manifest.json`**: Maps your source files to the specific hashed output files.

### Q: Where is the Turbopack code?
**A:** Turbopack outputs its development build artifacts into `.next/server` and `.next/static`, just like Webpack. The `turbopack` file in the root is just an internal state/IPC file.

### Q: Why are file names hashed (e.g., `2ccd4236.js`)?
**A:** For **Caching**.
- The server tells the browser to cache these files "forever" (Immutable).
- When you change your code, the hash changes (e.g., to `a8f9b2c1.js`).
- The browser sees a new filename in the HTML and knows it MUST download the new version.

## 7. Rendering Patterns (SSR vs ISR vs CSR)

### Q: Does "Client Component" mean "No Server Rendering"?
**A:** **No.**
- **Initial Load**: Even Client Components (`'use client'`) are pre-rendered on the server to generate the initial HTML snapshot.
- **Hydration**: The browser then downloads the JS, runs React, and "hydrates" that HTML to make it interactive (attach event listeners).

### Q: Does using a Database mean I must use SSR?
**A:** **No.**
- **Default Behavior**: Next.js tries to **cache** database results at build time (Static).
- **Dynamic (SSR)**: You must explicitly opt-in by using dynamic functions (`cookies()`, `headers()`) or `export const dynamic = 'force-dynamic'`.

### Q: What is ISR (Incremental Static Regeneration)?
**A:** A hybrid between Static and Dynamic.
- **Strategy**: Cache the page key, but expire it after X seconds.
- **Code**: `export const revalidate = 60;`
- **Flow**:
    1.  User A visits: Gets cached HTML (Instant).
    2.  User B visits after 60s: Gets cached HTML (Instant), but triggers a background regeneration.
    3.  User C visits: Gets the NEW HTML.
- **Verdict**: Great for public pages (Pricing, listings) that need data freshness but can afford a 1-minute delay.

### Q: Are SSR and ISR both Server-Side?
**A:** **Yes.** Both run 100% on the server (Node.js). The browser only receives the HTML.

## 8. React Server Components (RSC) & Async

### Q: Can I use `async/await` in a React Component?
**A:**
- **Server Components**: **YES**. (`export default async function Page() ...`)
- **Client Components**: **NO**. (You must use `useEffect` or libraries like TanStack Query).

### Q: Does an `async` Server Component block rendering?
**A:** **Yes.**
- The server pauses rendering that component until the `await` finishes.
- **Streaming**: You can unblock the rest of the page by wrapping the async component in `<Suspense>`. This allows the server to send the "shell" immediately and stream the async part when it's ready.

### Q: What distinguishes a Component from a Helper Function?
**A:**
1.  **Capitalization**: Components MUST be **Capitalized** (`function Keypad`). Helpers are **lowercase** (`function calculate()`).
2.  **Return**: Components return **JSX**. Helpers return **data**.

### Q: Does ISR run in the background?
**A:** **Yes.** When the cache expires, the request triggers a background rebuild. The user sees the old content, while the server generates the new one.

### Q: Does SSG run at build time only?
**A:** **Yes.** The code runs once during `npm run build`. The resulting HTML is saved and served statically forever (until the next deployment).

### Q: Does SSR regenerate the HTML file?
**A:** **No.**
- **ISR**: Updates a persistent HTML file on the server (Cache).
- **SSR**: **Generates** HTML on-the-fly for that specific response, sends it, and forgets it. It does not update any file on disk.

## 9. Navigation & RSC Payloads

### Q: What is the difference between `<a href>` and `<Link href>`?
**A:**
- **`<a href="/about">`**: Performed by the **Browser**.
    - It requests the full page (`GET /about`).
    - The Server returns **HTML**.
    - The Browser destroys the current page and loads the new one (Full Reload).
- **`<Link href="/about">`**: Performed by **JavaScript (Next.js)**.
    - It intercepts the click.
    - It requests `GET /about` with a special header (`RSC: 1`).
    - The Server returns **RSC Payload** (a JSON-like binary format describing the component tree), NOT HTML.
    - React uses this data to update the DOM without a reload.

### Q: Which one should I use?
**A:** Always use `<Link>` for internal navigation (pages within your app). Use `<a>` only for external links (e.g., Google, Twitter).

### Q: Does SSG have a cache?
**A:** **SSG IS the cache.**
- The HTML file generated at build time (`npm run build`) is the permanent cache.
- It never expires. It is served instantly to every user.
- The only way to "clear" this cache is to rebuild and redeploy the app.

### Q: So only ISR has a cache?
**A:** **No, SSG also has a cache**, but it behaves differently:
- **SSG**: Permanent Cache (until rebuild).
- **ISR**: Temporary Cache (until revalidate time).
- **SSR**: No Page Cache (always fresh).

**Note**: Even in SSR, individual *data fetches* (`fetch('api')`) might be cached by Next.js unless you strictly opt-out.


