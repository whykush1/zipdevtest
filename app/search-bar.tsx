"use client";

export function SearchBar() {
  return (
    <input
      type="search"
      placeholder="Search tools (e.g. compress, pdf, qr)"
      className="w-full rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm outline-none ring-blue-500 transition focus:ring"
      onChange={(event) => {
        const query = event.currentTarget.value.trim().toLowerCase();
        const cards = document.querySelectorAll<HTMLElement>("[data-tool-card]");
        cards.forEach((card) => {
          const title = card.dataset.title || "";
          const description = card.dataset.description || "";
          const category = (card.dataset.category || "").toLowerCase();
          const visible = !query || title.includes(query) || description.includes(query) || category.includes(query);
          card.style.display = visible ? "block" : "none";
        });
      }}
    />
  );
}
