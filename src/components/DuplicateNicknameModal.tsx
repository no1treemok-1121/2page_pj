import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

const DuplicateNicknameModal = ({ isOpen, onClose }: Props) => {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[320px] rounded-[16px] p-6 text-center">
        <DialogHeader className="items-center">
          <div className="text-3xl mb-2">😅</div>
          <DialogTitle className="text-lg">이미 사용 중인 닉네임입니다</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground mt-1">
            다른 닉네임을 입력해주세요.
          </DialogDescription>
        </DialogHeader>
        <button
          onClick={onClose}
          className="mt-4 w-full rounded-button bg-primary px-4 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          확인
        </button>
      </DialogContent>
    </Dialog>
  );
};

export default DuplicateNicknameModal;
