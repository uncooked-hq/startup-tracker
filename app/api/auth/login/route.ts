import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { fullName, contact } = body

    if (!fullName || !contact) {
      return NextResponse.json(
        { error: 'Full name and email or phone are required' },
        { status: 400 }
      )
    }

    const name = fullName.trim()
    const contactValue = contact.trim().toLowerCase()

    // Determine if contact is email or phone
    const isEmail = contactValue.includes('@')

    // Look up in community_members — match full_name AND (email OR phone)
    let query = supabase
      .from('community_members')
      .select('id, full_name, email, phone')
      .ilike('full_name', name)

    if (isEmail) {
      query = query.ilike('email', contactValue)
    } else {
      // Normalize phone: strip spaces, dashes, parens
      const normalizedPhone = contactValue.replace(/[\s\-\(\)]/g, '')
      query = query.or(`phone.eq.${normalizedPhone},phone.ilike.%${normalizedPhone.slice(-10)}%`)
    }

    const { data: members, error } = await query.limit(1)

    if (error) throw error

    if (!members || members.length === 0) {
      return NextResponse.json(
        { error: 'No matching member found. Make sure your name and email/phone match your registration.' },
        { status: 401 }
      )
    }

    const member = members[0]

    return NextResponse.json({
      success: true,
      user: {
        id: member.id,
        fullName: member.full_name,
        email: member.email,
        phone: member.phone,
      },
    })
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { error: 'Something went wrong. Please try again.' },
      { status: 500 }
    )
  }
}
