# Phase 3 Plan: Room Catalog & Shared LayoutId Motion

**Phase:** 3 of 7  
**Directory:** `.planning/phases/03-room-catalog-and-shared-layoutid-motion/`  
**Related Specs:** [.planning/PROJECT.md](file:///c:/Users/hamih/OneDrive/Desktop/AtoZ%20Coder/Advanced%20MERN/Hotel-Management-System/.planning/PROJECT.md) | [.planning/ROADMAP.md](file:///c:/Users/hamih/OneDrive/Desktop/AtoZ%20Coder/Advanced%20MERN/Hotel-Management-System/.planning/ROADMAP.md)  
**Status:** Ready for Execution 🚀

---

## 1. Objective

Implement the application's signature motion motif: a Framer Motion shared `layoutId` transition connecting the RoomCard image/title seamlessly into the RoomDetailPage hero header. Ensure search results stagger in once on load (60ms offset), re-skin the catalog and detail pages with solid panels and Lucide line icons, and provide a unified line-drawn empty state.

---

## 2. Target Files

- `frontend/src/components/guest/RoomCard.jsx`: Card re-skin, shared `layoutId` tags, and gold price styling.
- `frontend/src/pages/public/RoomCatalogPage.jsx`: Staggered container animations (60ms), solid panel filters, line-drawn empty state.
- `frontend/src/pages/public/RoomDetailPage.jsx`: Shared `layoutId` destination on hero image and title, solid specs card, Lucide amenities grid, sticky booking sidebar.
- `frontend/src/components/common/EmptyState.jsx`: Unified line-drawn key/bell SVG illustration for zero-state views.

---

## 3. Tasks Breakdown

### Task 3.1: Staggered Catalog Load (`RoomCatalogPage.jsx`)
- Apply Framer Motion stagger container:
  ```javascript
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: { staggerChildren: 0.06 } // 60ms stagger on load only
    }
  };
  const cardVariants = {
    hidden: { opacity: 0, y: 15 },
    show: { opacity: 1, y: 0, transition: { duration: 0.35 } }
  };
  ```
- Remove any hover-based layout re-staggering.

### Task 3.2: Implement Signature Shared `layoutId` Transition
- In `RoomCard.jsx`:
  - Image container: `<motion.img layoutId={`room-image-${room._id}`} ... />`
  - Title: `<motion.h3 layoutId={`room-title-${room._id}`} ... />`
- In `RoomDetailPage.jsx`:
  - Destination hero image: `<motion.img layoutId={`room-image-${room._id}`} ... />`
  - Destination header title: `<motion.h1 layoutId={`room-title-${room._id}`} ... />`
- Ensure smooth interpolation without layout distortion or jumping scroll offsets.

### Task 3.3: Re-Skin `RoomDetailPage.jsx`
- Replace cream/linen containers with solid `--surface` (`#131A26`) and 1px borders (`#2A3547`).
- Amenity pills: solid `--surface-2` (`#1B2433`) cards with single-stroke Lucide icons (`strokeWidth={1.75}`).
- Sticky Booking Card:
  - Container: solid `#131A26` with 1px `#2A3547` border.
  - Inputs: `#1B2433` with `#2A3547` border, focus border `#3FD0C9`.
  - Financial breakdown: `#1B2433` with gold total highlight (`#C9A15A`).
  - Submit CTA: `#C9A15A` hover `#B88E45` with `#0A0F1A` text.

### Task 3.4: Create Line-Drawn Empty State (`EmptyState.jsx`)
- Render a bespoke minimalist line-drawn key / hotel bell illustration in `#C9A15A` and `#3FD0C9`.
- Mount in `RoomCatalogPage.jsx` when query returns zero inventory.

---

## 4. Verification Gates

1. Click from any RoomCard on `/rooms` to `/rooms/:id` — verify smooth shared `layoutId` visual morph.
2. Confirm 60ms stagger executes only on initial load.
3. Test empty query (e.g., date in past or zero capacity) to verify the line-drawn key/bell empty state.
