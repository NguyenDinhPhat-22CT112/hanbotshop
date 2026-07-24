import { ProfileForm } from '../../../components/profile-form';

export default function ProfilePage() {
  return (
    <main>
      <section className="catalog-header">
        <p className="eyebrow">Tài khoản</p>
        <h1>Hồ sơ</h1>
      </section>
      <section className="narrow-section">
        <ProfileForm />
      </section>
    </main>
  );
}
