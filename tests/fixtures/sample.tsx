// line comment
import { Button } from "./button";

export function Card(props: CardProps) {
  const label = `Item: ${props.title}`;
  return (
    <section className="card">
      <Button onClick={props.submit}>{label}</Button>
    </section>
  );
}
