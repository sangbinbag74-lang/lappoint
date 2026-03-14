'use client'

import { useState, useTransition, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { updateProfile } from '@/app/actions/profile'

interface Props {
  currentNickname: string
  currentAvatarUrl: string | null
}

export default function ProfileEditForm({ currentNickname, currentAvatarUrl }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [preview, setPreview] = useState<string | null>(currentAvatarUrl)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const url = URL.createObjectURL(file)
    setPreview(url)
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError(null)
    const formData = new FormData(e.currentTarget)
    startTransition(async () => {
      const result = await updateProfile(formData)
      if (!result.success) {
        setError(result.error === 'INVALID_NICKNAME' ? '닉네임은 1~20자이어야 합니다.' : '오류가 발생했습니다.')
        return
      }
      setSuccess(true)
      router.refresh()
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* 아바타 */}
      <div className="flex flex-col items-center gap-3">
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          className="relative w-20 h-20 rounded-full overflow-hidden border-2 border-dashed border-gray-300
            hover:border-blue-400 transition-colors bg-gray-50 flex items-center justify-center"
        >
          {preview ? (
            <Image src={preview} alt="프로필" fill className="object-cover" unoptimized />
          ) : (
            <span className="text-gray-400 text-2xl">👤</span>
          )}
          <span className="absolute inset-0 bg-black/0 hover:bg-black/10 transition-colors rounded-full" />
        </button>
        <input
          ref={fileRef}
          type="file"
          name="avatar"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />
        <p className="text-xs text-gray-400">클릭하여 프로필 사진 변경</p>
      </div>

      {/* 닉네임 */}
      <div className="space-y-1.5">
        <label className="text-sm font-semibold text-gray-700">닉네임</label>
        <input
          type="text"
          name="nickname"
          defaultValue={currentNickname}
          maxLength={20}
          required
          className="w-full bg-gray-50 border border-gray-200 rounded-lg px-4 py-2.5 text-gray-900 text-sm
            focus:outline-none focus:border-blue-400 focus:bg-white transition-colors"
        />
        <p className="text-xs text-gray-400">최대 20자</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2">
          <p className="text-green-700 text-sm font-medium">프로필이 업데이트되었습니다.</p>
        </div>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 disabled:text-gray-400
          text-white font-bold py-2.5 rounded-lg text-sm transition-colors"
      >
        {isPending ? '저장 중...' : '저장하기'}
      </button>
    </form>
  )
}
