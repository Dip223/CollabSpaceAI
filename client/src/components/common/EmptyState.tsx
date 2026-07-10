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
      <h2 className="text-2xl font-bold text-white">
        {title}
      </h2>

      <p className="mt-3 text-gray-400">
        {description}
      </p>
    </div>
  );
}