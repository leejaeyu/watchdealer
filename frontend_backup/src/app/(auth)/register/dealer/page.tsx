import RegisterForm from "../RegisterForm";

export default function Page() {
  return (
    <RegisterForm
      defaultRole="dealer"
      title="딜러 회원가입"
      subtitle="신청 후 운영자 승인까지 대기하게 됩니다."
    />
  );
}
