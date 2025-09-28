import RegisterForm from "../RegisterForm";

export default function Page() {
  return (
    <RegisterForm
      defaultRole="user"
      title="일반인 회원가입"
      subtitle="기본 정보 입력 후 즉시 로그인할 수 있습니다."
    />
  );
}
