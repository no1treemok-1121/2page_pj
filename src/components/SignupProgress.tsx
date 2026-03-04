interface SignupProgressProps {
  current: number;
  total: number;
}

const SignupProgress = ({ current, total }: SignupProgressProps) => {
  return (
    <div className="flex items-center justify-between px-4 py-4">
      <div className="flex gap-2">
        {Array.from({ length: total }).map((_, i) => (
          <div
            key={i}
            className={`h-2 w-2 rounded-full ${
              i < current ? "bg-primary" : "bg-border"
            }`}
          />
        ))}
      </div>
      <span className="text-xs text-muted-foreground">
        {current} / {total}
      </span>
    </div>
  );
};

export default SignupProgress;
