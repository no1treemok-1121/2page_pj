interface WritePromptCardProps {
  onOpen: () => void;
}

const WritePromptCard = ({ onOpen }: WritePromptCardProps) => {
  return (
    <div
      onClick={onOpen}
      className="flex items-center gap-3 cursor-pointer rounded-[12px] p-4 border transition-shadow hover:shadow-sm"
      style={{ background: "#FFFFFF", borderColor: "#E4E0D9" }}
    >
      {/* Avatar */}
      <div
        className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full text-sm font-medium text-primary-foreground"
        style={{ background: "#7B5EA7" }}
      >
        나
      </div>
      {/* Fake input */}
      <div className="flex-1 min-w-0">
        <p className="text-sm" style={{ color: "#9E9E9E" }}>
          오늘 하루 어땠어요? 여기선 다 말해도 돼요.
        </p>
      </div>
    </div>
  );
};

export default WritePromptCard;
