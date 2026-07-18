import { splitByFillers } from '../utils/fillerWords'

/** 把文本中的口癖词用波浪线标出(不用删除线、不用刺眼红色) */
export default function FillerWordMark({ text }: { text: string }) {
  const parts = splitByFillers(text)
  return (
    <>
      {parts.map((part, i) =>
        part.isFiller ? (
          <span key={i} className="filler-mark">
            {part.text}
          </span>
        ) : (
          <span key={i}>{part.text}</span>
        ),
      )}
    </>
  )
}
