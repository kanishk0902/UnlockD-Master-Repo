Unlock'D: The Intelligent Financial Ledger

Unlock'D is an enterprise-grade financial management platform designed to provide total transparency, real-time liquidity tracking, and automated financial insights for individuals and collaborative groups. By moving beyond simple record-keeping, Unlock'D acts as an intelligent command center for personal and shared capital, leveraging modern web technologies to bridge the gap between complex banking systems and user-friendly interfaces.



1.⁠ ⁠System Architecture

Unlock'D is built upon a robust, scalable architecture that prioritizes data integrity and performance.

Frontend Engine: The application utilizes a highly optimized React stack with TypeScript. We employ a centralized state management pattern using useReducer and Context API, acting as a local state machine. This ensures that complex operations—such as multi-party debt netting or multi-currency conversions—remain predictable and performant.

Persistence Layer: We utilize Supabase (powered by PostgreSQL) as our primary database. This decision was critical to ensuring ACID compliance for every financial transaction. Unlike standard JSON-based applications, Unlock'D guarantees that ledger updates are atomic; if a transfer fails midway, the database rolls back to its previous state, preventing "ghost" transactions or orphaned data.

Data Security: Security is handled through Row-Level Security (RLS) policies within the database, ensuring that sensitive financial records are only accessible to authorized users. All transfer requests are validated with SHA-256 hashing to prevent data tampering during transit.


2.⁠ ⁠Advanced Feature Modules
Unlock'D is composed of distinct modules, each designed to solve specific financial bottlenecks:

Smart Statement Import (Data Ingestion): Our secure CSV parser runs entirely client-side. By processing statements within the browser's memory, we eliminate the need for users to upload sensitive financial data to an external server. The module features an "Auto-Categorization Engine" that uses regex pattern matching to classify expenses into travel, food, entertainment, or utility categories instantly.

Predictive Runway Forecasting: Using historical transaction velocity, the MoneyExhaustionWatch module calculates a user’s "financial runway." It forecasts how long current liquidity will last based on current spending trends, providing proactive alerts to prevent budget overruns.

Multi-Currency Engine: Recognizing the global nature of modern finance, Unlock'D provides a real-time currency conversion engine. This layer abstracts the underlying currency of the ledger, allowing users to toggle between INR and USD seamlessly. The engine utilizes a centralized scaling utility to manage floating-point math, ensuring that currency conversion does not lead to rounding errors.

Collaborative Debt Netting: The BillSplitter module employs a greedy algorithm to optimize debt settlement. Instead of users paying each other back for every individual transaction, the system calculates the minimal set of transfers required to settle all group debts, saving users time and transaction fees.

3.⁠ ⁠Database Schema & Logic Flow
The backbone of Unlock'D is its normalized relational database schema, which is designed for speed and consistency:

Transactions Table: Stores id, amount, category, from_user_id, to_user_id, and created_at. All transaction lookups are indexed to maintain O(logn) performance, ensuring that even with thousands of records, the history loads instantaneously.

Accounts Table: Tracks real-time balances, maintaining an immutable audit log of every change.

Transaction Workflow:
Initiation: The client generates a requestId and hashes the transaction details.

Submission: The payload is sent to the PostgreSQL backend.

Validation: The server validates funds availability using a database-level lock to prevent race conditions (concurrency control).

Real-Time Broadcast: Once validated, Supabase Realtime pushes the update to all active sessions, ensuring that balance updates are reflected across all connected devices in milliseconds.


4.⁠ ⁠Technical Problem-Solving
One of the primary challenges we faced was maintaining local-first responsiveness while ensuring global consistency. By combining the local useFinance state provider with a synchronized PostgreSQL backend, we achieved a "Best of Both Worlds" architecture. The UI feels instantaneous because it updates locally, but it is backed by an enterprise-grade database that ensures truth and persistence.

The addition of the Multi-Currency Engine further showcased our ability to handle complex state transformations. By decoupling the raw data from its representation, we enabled the application to be both modular and highly extensible, setting the stage for future integrations with live banking APIs.

5.⁠ ⁠Conclusion

Unlock'D is more than just a dashboard; it is an intelligent system for financial control. Whether it is performing complex currency conversions, running predictive burn-rate models, or optimizing multi-party debt settlements, Unlock'D provides the tools of a professional banking interface inside a modern, lightning-fast React application. It is optimized, secure, and ready for deployment.
