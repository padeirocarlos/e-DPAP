You are a senior solutions architect, full-stack engineer, GIS specialist, UX designer, and DevOps architect.

Your task is to design and implement a complete production-ready system for the Government of Mozambique (Direcção Provincial de Agricultura e Pescas - DPAP) to support the mapping and management of actors operating in the agricultural, livestock, fisheries, and aquaculture sectors.

==================================================
BUSINESS CONTEXT
==================================================

The system will be used in Mozambique, specifically in Maputo Province.

The objective is to create a digital and georeferenced database of all actors operating in agriculture, livestock, fisheries, and aquaculture.

The solution must support:

1. Field data collection throughout all districts, administrative posts and localities.
2. Georeferenced registration of actors.
3. Offline-capable data collection using Android devices.
4. Synchronization once internet connectivity becomes available.
5. Centralized web-based management and analytics platform.
6. Multi-user access.
7. Reporting and dashboard capabilities.
8. Data export functionality.
9. Long-term sustainability with minimal recurring licensing costs.

The solution must prioritize:

- Open-source technologies.
- Low-bandwidth environments.
- Intermittent power.
- Limited internet coverage.
- Simplicity for government staff.
- Portuguese language as default.
- Future scalability.

==================================================
FUNCTIONAL REQUIREMENTS
==================================================

The solution shall contain TWO MAJOR COMPONENTS.

--------------------------------------------------
COMPONENT 1:
WEB MANAGEMENT PLATFORM
--------------------------------------------------

The web application must provide:

A. Authentication

- Login
- Password reset
- Role-based access

User Roles:

1. Administrator
2. Editor
3. Read-only Viewer

B. Dashboard

Dashboard should display:

- Total actors registered
- Actors by district
- Actors by sector
- Actors by actor type
- Registration trends
- Geographic coverage
- Data completeness indicators
- Synchronization status

Charts should include:

- Bar charts
- Pie charts
- Line charts
- Geographic heat maps

C. Geographic Visualization

Display all registered records on maps.

Use:

- OpenStreetMap
- Leaflet

Capabilities:

- Cluster markers
- Search actors
- Filter by district
- Filter by locality
- Filter by subsector
- Filter by actor category

D. Actor Management

Create
Read
Update
Delete

Support:

1. Producers
2. Producer Associations
3. Livestock Producers
4. Fisheries Actors
5. Aquaculture Actors
6. NGOs
7. International Organizations
8. Cooperation Agencies
9. Research Institutions
10. Educational Institutions
11. Private Companies
12. Public Institutions

E. Search

Advanced Search by:

- Name
- Sector
- District
- Location
- Legal Status
- Organization Type

F. Reporting

Generate:

- PDF reports
- Excel reports
- CSV exports

Reports by:

- District
- Sector
- Actor Type
- Date Range

G. Audit Trail

Record:

- User
- Action
- Timestamp
- Record affected

H. Administration

Manage:

- Users
- Districts
- Administrative Posts
- Localities
- Categories
- System Settings

==================================================
COMPONENT 2:
OFFLINE DATA COLLECTION APP
==================================================

This application will be used by enumerators in rural areas.

Requirements:

A. Android Support

- Android 8+
- Phone and Tablet

B. Progressive Web App (PWA)

Preferred architecture:

A PWA capable of:

- Installation on Android
- Offline operation
- Local storage
- Synchronization when online

Alternative:

React Native application if justified.

C. Offline Capability

Must work completely without internet.

Use:
- IndexedDB

D. Synchronization

Implement:

- Automatic sync
- Manual sync button
- Conflict resolution

E. GPS

Capture:

- Latitude
- Longitude
- Timestamp
- Accuracy

F. Photo Capture

Allow:

- Farm photos
- Infrastructure photos
- Association documents

Support image compression.

G. Form Validation

Mandatory fields.

Data quality controls.

==================================================
DATA TO BE COLLECTED
==================================================

Design a normalized relational data model.

The system should collect information such as:

IDENTIFICATION

- Name
- Registration Number
- Type of Actor
- Legal Status

LOCATION

- Province
- District
- Administrative Post
- Locality
- GPS Coordinates

CONTACTS

- Responsible Person
- Mobile Number
- Email
- Address

ACTIVITY

- Agriculture
- Livestock
- Fisheries
- Aquaculture

TECHNOLOGY

- Technologies Used
- Production Systems

FINANCIAL INFORMATION

- Funding Sources
- Credit Access

ASSOCIATIONS

- Membership
- Governance Structure

PRODUCTION

- Main Products
- Production Capacity

MARKETING

- Commercialization Channels

CHALLENGES

- Operational Challenges
- Infrastructure Challenges

RELATIONSHIPS

- Government Programs
- Partners
- Beneficiaries

==================================================
Offline Architectre Requirements
==================================================

The field data collection application shall be a Progressive Web App (PWA).

Use:

- IndexedDB as local offline database
- Dexie.js as IndexedDB abstraction layer
- Service Workers for offline operation
- Background Sync API when supported

Synchronization:

- Store all changes locally first
- Queue pending records
- Sync automatically when connectivity returns
- Allow manual synchronization
- Resolve conflicts using Last Updated Timestamp and Server Versioning

Central Database:

- PostgreSQL 16
- PostGIS extension

Do not use SQLite on the client unless a native Android application is selected.

==================================================
NON-FUNCTIONAL REQUIREMENTS
==================================================

Architecture must support:

- 10,000+ actors
- 300 concurrent users
- Mobile responsiveness
- Low bandwidth optimization
- Security
- Scalability

Security:

- JWT Authentication
- Role-based authorization
- HTTPS
- Password encryption
- Audit logs

Backups:

- Daily backups
- Restore procedures

==================================================
TECHNOLOGY STACK
==================================================

Recommend and implement:

Frontend:
- Next.js
- TypeScript
- Tailwind CSS
- Leaflet Maps

Backend:
- Spring Boot

Database:
- PostgreSQL
- PostGIS

Authentication:
- Keycloak or JWT

Offline Data Collection:
- PWA
- Service Workers
- IndexedDB

Deployment:
- Docker
- Docker Compose

Cloud Recommendation:
- Local government server

==================================================
DELIVERABLES REQUIRED
==================================================

Provide:

1. Complete system architecture diagram
2. Database ER diagram
3. Detailed data model
4. API specifications
5. User stories
6. Use cases
7. Wireframes
8. Folder structure
9. Source code structure
10. Docker deployment architecture
11. Security architecture
12. Synchronization architecture
13. GIS architecture
14. Implementation roadmap
15. Testing strategy
16. CI/CD pipeline
17. Infrastructure sizing
18. Cost estimation suitable for Mozambique
19. Administrator Manual
20. User Manual

==================================================
IMPORTANT MOZAMBIQUE-SPECIFIC CONSIDERATIONS
==================================================

The solution must be optimized for:

- Rural connectivity constraints.
- Intermittent power availability.
- Android devices commonly available in Mozambique.
- Portuguese language.
- Government institutions.
- Local hosting options.
- Low operational costs.
- Open-source technologies.
- Future integration with Mozambique e-Government platforms.

Provide detailed technical specifications and generate production-ready code scaffolding.