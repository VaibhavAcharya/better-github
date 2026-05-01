import { Avatar, AvatarFallback, AvatarImage } from '#/components/ui/avatar'
import { cn } from '#/lib/utils'

interface UserAvatarProps {
  login: string | null | undefined
  src?: string | null
  size?: 'xs' | 'sm' | 'md' | 'lg'
  className?: string
}

const SIZES: Record<NonNullable<UserAvatarProps['size']>, string> = {
  xs: 'size-4 text-[8px]',
  sm: 'size-5 text-[10px]',
  md: 'size-6 text-[10px]',
  lg: 'size-8 text-xs',
}

export function UserAvatar({
  login,
  src,
  size = 'sm',
  className,
}: UserAvatarProps) {
  const initial = (login ?? '?').slice(0, 2).toUpperCase()
  return (
    <Avatar className={cn(SIZES[size], 'rounded-sm', className)}>
      {src ? <AvatarImage src={src} alt={login ?? ''} /> : null}
      <AvatarFallback className="rounded-sm bg-muted text-muted-foreground">
        {initial}
      </AvatarFallback>
    </Avatar>
  )
}
