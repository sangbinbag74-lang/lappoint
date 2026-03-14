import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import ProfileEditForm from '@/components/ProfileEditForm'

export default async function ProfileEditPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const { data: userData } = await supabase
    .from('users')
    .select('nickname, avatar_url')
    .eq('id', user.id)
    .single()

  return (
    <div className="max-w-md mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/mypage" className="text-gray-400 hover:text-gray-600 text-sm">← 마이페이지</Link>
        <h1 className="text-xl font-black text-gray-900">프로필 수정</h1>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-6">
        <ProfileEditForm
          currentNickname={userData?.nickname ?? ''}
          currentAvatarUrl={userData?.avatar_url ?? null}
        />
      </div>

      <p className="text-xs text-gray-400 text-center">
        * 프로필 사진은 Supabase Storage의 avatars 버킷에 저장됩니다.
      </p>
    </div>
  )
}
