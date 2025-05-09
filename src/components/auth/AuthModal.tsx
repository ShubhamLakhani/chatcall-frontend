import Modal from '~/components/common/Modal';
import LoginForm from '~/components/auth/LoginForm';
import SignupForm from '~/components/auth/SignupForm';
import { useAppDispatch } from '~/hooks/useAppDispatch';
import { useAppSelector } from '~/hooks/useAppSelector';
import { closeAuthModal } from '~/store/slices/modalSlice';

const AuthModal = () => {
  const dispatch = useAppDispatch();
  const { isAuthModalOpen, authView } = useAppSelector((state) => state.modal);

  return (
    <Modal
      isOpen={isAuthModalOpen}
      onClose={() => dispatch(closeAuthModal())}
      title={authView === 'login' ? 'Login' : 'Sign Up'}
    >
      {authView === 'login' ? <LoginForm /> : <SignupForm />}
    </Modal>
  );
};

export default AuthModal;
