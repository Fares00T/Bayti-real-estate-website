import Card from "../../components/card/Card";
import Filter from "../../components/filter/Filter";
import Map from "../../components/map/Map";
import "./listpage.scss";
import { Await, useLoaderData, useSearchParams } from "react-router-dom";
import { Suspense, useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, List as ListIcon, Map as MapIcon } from "lucide-react";

const postsPerPage = 12;

const SORTS = {
  "": ["Recommended", null],
  newest: ["Newest", (a, b) => new Date(b.createdAt) - new Date(a.createdAt)],
  price_asc: ["Price: low to high", (a, b) => a.price - b.price],
  price_desc: ["Price: high to low", (a, b) => b.price - a.price],
};

function Results({ posts: unsorted }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const sort = SORTS[searchParams.get("sort")] ? searchParams.get("sort") : "";
  // The API orders featured first, then newest; other orders are applied here
  const posts = useMemo(
    () => (SORTS[sort][1] ? [...unsorted].sort(SORTS[sort][1]) : unsorted),
    [unsorted, sort]
  );
  const changeSort = (e) => {
    const next = new URLSearchParams(searchParams);
    if (e.target.value) next.set("sort", e.target.value);
    else next.delete("sort");
    setSearchParams(next);
  };
  const [currentPage, setCurrentPage] = useState(1);

  // New filters → back to the first page
  useEffect(() => {
    setCurrentPage(1);
  }, [searchParams]);

  const totalPages = Math.max(1, Math.ceil(posts.length / postsPerPage));
  const page = Math.min(currentPage, totalPages);
  const startIndex = (page - 1) * postsPerPage;
  const currentPosts = posts.slice(startIndex, startIndex + postsPerPage);

  const goTo = (p) => {
    setCurrentPage(p);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <>
      <div className="resultBar">
        <p className="resultCount">
          <strong>{posts.length}</strong> {posts.length === 1 ? "property" : "properties"} found
        </p>
        <label className="sortSelect">
          <span>Sort by</span>
          <select value={sort} onChange={changeSort}>
            {Object.entries(SORTS).map(([value, [label]]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {currentPosts.length > 0 ? (
        <div className="results">
          {currentPosts.map((post) => (
            <Card key={post.id} item={post} variant="grid" />
          ))}
        </div>
      ) : (
        <div className="empty-state">
          No properties match these filters. Try widening your search.
        </div>
      )}

      {totalPages > 1 && (
        <nav className="pagination" aria-label="Pagination">
          <button
            className="btn btn-outline btn-sm"
            onClick={() => goTo(page - 1)}
            disabled={page === 1}
          >
            <ChevronLeft size={16} /> Prev
          </button>
          <div className="pages">
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                className={p === page ? "active" : ""}
                onClick={() => goTo(p)}
                aria-current={p === page ? "page" : undefined}
              >
                {p}
              </button>
            ))}
          </div>
          <button
            className="btn btn-outline btn-sm"
            onClick={() => goTo(page + 1)}
            disabled={page === totalPages}
          >
            Next <ChevronRight size={16} />
          </button>
        </nav>
      )}
    </>
  );
}

function ListPage() {
  const data = useLoaderData();
  // Phones and tablets show the list or the map, not both
  const [view, setView] = useState("list");

  return (
    <div className={`listPage view-${view}`}>
      <div className="listContainer">
        <Filter />

        <Suspense fallback={<div className="loading">Loading properties…</div>}>
          <Await
            resolve={data.postResponse}
            errorElement={
              <div className="empty-state">Could not load properties.</div>
            }
          >
            {(postResponse) => <Results posts={postResponse.data} />}
          </Await>
        </Suspense>
      </div>

      <div className="mapContainer">
        <Suspense fallback={<div className="mapPlaceholder" />}>
          <Await
            resolve={data.postResponse}
            errorElement={<div className="mapPlaceholder" />}
          >
            {(postResponse) => <Map items={postResponse.data} />}
          </Await>
        </Suspense>
      </div>

      <button
        type="button"
        className="viewToggle"
        onClick={() => setView((v) => (v === "list" ? "map" : "list"))}
      >
        {view === "list" ? (
          <>
            Map <MapIcon size={16} />
          </>
        ) : (
          <>
            List <ListIcon size={16} />
          </>
        )}
      </button>
    </div>
  );
}

export default ListPage;
