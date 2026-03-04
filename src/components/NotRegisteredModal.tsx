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
  onSignup: () => void;
}

const NotRegisteredModal = ({ isOpen, onClose, onSignup }: Props) => {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[320px] rounded-[16px] p-6 text-center">
        <DialogHeader className="items-center">
          <div className="text-3xl mb-2">🔍</div>
          <DialogTitle className="text-lg">가입된 계정이 없어요</DialogTitle>
          <DialogDescription className="text-sm text-muted-foreground mt-1">
            이면에 가입된 정보가 없습니다.
            <br />
            초대코드를 받아 회원가입해주세요.
          </DialogDescription>
        </DialogHeader>
        <div className="mt-4 flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 rounded-button border border-border bg-card px-4 py-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted"
          >
            닫기
          </button>
          <button
            onClick={onSignup}
            className="flex-1 rounded-button bg-primary px-4 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            회원가입하기
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default NotRegisteredModal;
