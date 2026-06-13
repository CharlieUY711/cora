# =========================
# CONFIG
# =========================

$base = "supabase/functions"
$frontend = "src"

# =========================
# CREATE DIRECTORIES
# =========================

New-Item -ItemType Directory -Force -Path "$base/get-near-products"
New-Item -ItemType Directory -Force -Path "$base/verify-age"
New-Item -ItemType Directory -Force -Path "$frontend/components"
New-Item -ItemType Directory -Force -Path "$frontend/hooks"

# =========================
# EDGE FUNCTION: get-near-products
# =========================

@"
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

serve(async (req) => {
  try {
    const { lat, lng, radius_km = 10 } = await req.json()

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL"),
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
    )

    const { data, error } = await supabase.rpc("get_products_near", {
      lat,
      lng,
      radius_km
    })

    if (error) throw error

    return new Response(JSON.stringify(data))
  } catch {
    return new Response(JSON.stringify({ error: "fail" }), { status: 400 })
  }
})
"@ | Set-Content "$base/get-near-products/index.ts"

# =========================
# EDGE FUNCTION: verify-age
# =========================

@"
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

serve(async (req) => {
  const { user_id } = await req.json()

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL"),
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
  )

  await supabase
    .from("profiles")
    .update({ age_verified: true })
    .eq("id", user_id)

  return new Response(JSON.stringify({ ok: true }))
})
"@ | Set-Content "$base/verify-age/index.ts"

# =========================
# FRONTEND: MapView
# =========================

@"
import { useEffect, useRef } from "react"

export default function MapView({ products }) {
  const ref = useRef(null)

  useEffect(() => {
    if (!ref.current) return

    const map = new google.maps.Map(ref.current, {
      center: { lat: -34.9, lng: -56.2 },
      zoom: 12
    })

    products.forEach(p => {
      if (!p.latitude || !p.longitude) return

      new google.maps.Marker({
        position: { lat: p.latitude, lng: p.longitude },
        map
      })
    })
  }, [products])

  return <div ref={ref} style={{ height: 400 }} />
}
"@ | Set-Content "$frontend/components/MapView.tsx"

# =========================
# FRONTEND: Location Fetch
# =========================

@"
export async function fetchNearby(lat, lng) {
  const res = await fetch('/functions/v1/get-near-products', {
    method: 'POST',
    body: JSON.stringify({ lat, lng, radius_km: 10 })
  })

  return res.json()
}
"@ | Set-Content "$frontend/hooks/useLocation.ts"

# =========================
# FRONTEND: UX Hook
# =========================

@"
import { useState } from "react"

export function useAsyncAction() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const run = async (fn) => {
    setLoading(true)
    setError(null)

    try {
      return await fn()
    } catch {
      setError('Error')
    } finally {
      setLoading(false)
    }
  }

  return { loading, error, run }
}
"@ | Set-Content "$frontend/hooks/useAsyncAction.ts"

# =========================
# DONE
# =========================

Write-Host "✅ Bloque 7 archivos creados correctamente"