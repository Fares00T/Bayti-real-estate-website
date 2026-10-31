import "./list.scss";
import Card from "../card/Card";

function List({ posts = [], onDelete, currentUser, emptyText = "No listings yet." }) {
  if (posts.length === 0) {
    return <div className="empty-state">{emptyText}</div>;
  }

  return (
    <div className="list">
      {posts.map((item) => (
        <Card
          key={item.id}
          item={item}
          onDelete={
            onDelete && currentUser?.id === item.userId ? onDelete : null
          }
        />
      ))}
    </div>
  );
}

export default List;
