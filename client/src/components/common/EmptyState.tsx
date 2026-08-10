interface Props {
  title: string;
  description: string;
}

export default function EmptyState({
  title,
  description,
}: Props) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <h2 className="text-2xl font-bold text-foreground">
        {title}
      </h2>

      <p className="mt-3 text-muted-foreground">
        {description}
      </p>
    </div>
  );
}