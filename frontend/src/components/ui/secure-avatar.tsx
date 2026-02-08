import { useEffect, useState } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { storageApi } from '@/lib/api'

interface SecureAvatarProps {
    src?: string
    fallback: string
    className?: string
}

export function SecureAvatar({ src, fallback, className }: SecureAvatarProps) {
    const [signedUrl, setSignedUrl] = useState<string | undefined>(undefined)

    useEffect(() => {
        let mounted = true

        async function fetchUrl() {
            if (!src) return

            // If it's already a full URL (http/https), likely authorized or public
            // But if it's a blob path or private url, we need to sign it.
            // Assumption: if it contains "blob.core.windows.net", we try to sign it OR just try to load it.
            // Best approach: try to sign everything that looks like a storage path.

            try {
                // Determine if we need to sign.
                // Optimistically assume we do if it's from our storage.
                // For now, always sign if provided.
                const url = await storageApi.signUrl(src)
                if (mounted) setSignedUrl(url)
            } catch (error) {
                console.error("Failed to sign avatar URL", error)
                // Fallback to original src if signing fails (maybe it was public)
                if (mounted) setSignedUrl(src)
            }
        }

        fetchUrl()

        return () => { mounted = false }
    }, [src])

    return (
        <Avatar className={className}>
            <AvatarImage src={signedUrl || src} />
            <AvatarFallback>{fallback}</AvatarFallback>
        </Avatar>
    )
}
