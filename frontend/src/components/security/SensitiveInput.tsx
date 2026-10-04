import { useId, useState, type InputHTMLAttributes } from 'react'
import { Eye, EyeOff } from 'lucide-react'

type SensitiveInputProps = InputHTMLAttributes<HTMLInputElement> & {
  unmaskLabel?: string
  maskLabel?: string
}

export function SensitiveInput({
  className = '',
  unmaskLabel = 'Unmask',
  maskLabel = 'Mask',
  ...props
}: SensitiveInputProps) {
  const [visible, setVisible] = useState(false)
  const generatedId = useId()
  const inputId = props.id ?? generatedId

  return (
    <div className="relative">
      <input
        {...props}
        id={inputId}
        type={visible ? 'text' : 'password'}
        className={'h-10 w-full rounded-md border bg-background px-3 pr-11 text-sm outline-none focus:ring-2 focus:ring-ring ' + className}
      />
      <button
        type="button"
        onClick={() => setVisible((current) => !current)}
        className="absolute inset-y-0 right-0 flex w-10 items-center justify-center rounded-r-md text-muted-foreground hover:bg-muted hover:text-foreground"
        aria-label={visible ? maskLabel : unmaskLabel}
        title={visible ? maskLabel : unmaskLabel}
      >
        {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  )
}
