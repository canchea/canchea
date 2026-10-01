export default function SearchLoading() {
  return (
    <main className="search-page" aria-busy="true" aria-label="Buscando canchas disponibles">
      <div className="container search-loading">
        <div className="search-loading-line search-loading-line--title" />
        <div className="search-loading-panel" />
        <div className="search-loading-grid">
          {Array.from({ length: 6 }, (_, index) => <div className="search-loading-card" key={index} />)}
        </div>
      </div>
    </main>
  );
}
