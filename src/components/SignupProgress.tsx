interface SignupProgressProps {
  current: number;
  total: number;
}

const SignupProgress = ({ current, total }: SignupProgressProps) => {
  return (
    <div className="flex items-center justify-between px-4 py-4">
      <div className="flex" style={{ gap: '8px' }}>
        {Array.from({ length: total }).map((_, i) => (
          <div
            key={i}
            className={`rounded-full ${
              i < current ? "bg-primary" : "bg-border"
            }`}
            style={{ width: '8px', height: '8px' }}
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
