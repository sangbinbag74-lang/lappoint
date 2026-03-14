'use client'

import { useState, useTransition } from 'react'
import { createPrediction } from '@/app/actions/predictions'

interface Props {
  raceId: string
}

export default function CreatePredictionForm({ raceId }: Props) {
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [question, setQuestion] = useState('')
  const [predictionType, setPredictionType] = useState<'race_winner' | 'custom'>('custom')
  const [options, setOptions] = useState(['', ''])
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const addOption = () => {
    if (options.length < 10) setOptions([...options, ''])
  }

  const removeOption = (i: number) => {
    if (options.length <= 2) return
    setOptions(options.filter((_, idx) => idx !== i))
  }

  const updateOption = (i: number, value: string) => {
    const next = [...options]
    next[i] = value
    setOptions(next)
  }

  const handleSubmit = () => {
    setError(null)
    startTransition(async () => {
      const res = await createPrediction(raceId, question, options, predictionType)
      if (!res.success) {
        setError(res.error ?? '오류가 발생했습니다.')
        return
      }
      setSuccess(true)
      setQuestion('')
      setOptions(['', ''])
      setPredictionType('custom')
      setTimeout(() => {
        setSuccess(false)
        setOpen(false)
      }, 1500)
    })
  }

  return (
    <div className="mt-2">
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="text-xs text-blue-600 hover:text-blue-800 font-bold border border-blue-200 bg-blue-50 hover:bg-blue-100 px-3 py-1.5 rounded-lg transition-colors"
        >
          + 예측 항목 추가
        </button>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-gray-900">새 예측 항목</span>
            <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600 text-lg leading-none">×</button>
          </div>

          {/* 질문 */}
          <div>
            <label className="text-xs text-gray-500 font-medium block mb-1">질문</label>
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="예: 이번 경기 우승자는?"
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-400 bg-gray-50"
            />
          </div>

          {/* 예측 타입 */}
          <div>
            <label className="text-xs text-gray-500 font-medium block mb-1">타입</label>
            <select
              value={predictionType}
              onChange={(e) => setPredictionType(e.target.value as 'race_winner' | 'custom')}
              className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-gray-50 focus:outline-none focus:border-blue-400"
            >
              <option value="custom">일반 (custom)</option>
              <option value="race_winner">레이스 우승자 (자동정산 가능)</option>
            </select>
          </div>

          {/* 선택지 */}
          <div>
            <label className="text-xs text-gray-500 font-medium block mb-1">
              선택지 {predictionType === 'race_winner' && <span className="text-blue-500">(드라이버 코드 또는 이름 입력)</span>}
            </label>
            <div className="space-y-1.5">
              {options.map((opt, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={opt}
                    onChange={(e) => updateOption(i, e.target.value)}
                    placeholder={predictionType === 'race_winner' ? `예: VER 또는 Max Verstappen` : `선택지 ${i + 1}`}
                    className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-blue-400 bg-gray-50"
                  />
                  {options.length > 2 && (
                    <button onClick={() => removeOption(i)} className="text-gray-300 hover:text-red-400 text-lg leading-none">×</button>
                  )}
                </div>
              ))}
            </div>
            {options.length < 10 && (
              <button onClick={addOption} className="mt-1.5 text-xs text-gray-400 hover:text-gray-600">
                + 선택지 추가
              </button>
            )}
          </div>

          {error && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
          {success && <p className="text-xs text-green-600 bg-green-50 border border-green-200 rounded-lg px-3 py-2">예측 항목이 생성되었습니다.</p>}

          <div className="flex gap-2">
            <button
              onClick={handleSubmit}
              disabled={isPending}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold py-2 rounded-lg transition-colors"
            >
              {isPending ? '생성 중...' : '생성'}
            </button>
            <button
              onClick={() => setOpen(false)}
              className="px-3 py-2 text-xs text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50"
            >
              취소
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
