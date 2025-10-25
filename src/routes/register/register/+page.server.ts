import { fail, redirect } from '@sveltejs/kit';

export const actions = {
  default: async ({ request, fetch }) => {
    const formData = await request.formData();
    const payload: Record<string, any> = {};
    for (const [key, value] of formData.entries()) {
      payload[key] = value;
    }

    // Ensure correct role/type mapping
    payload.type = payload.role || 'student';

    // Remove designation if not in schema
    if (payload.type === 'faculty') {
      delete payload.designation;
    }

    try {
      const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        return fail(res.status, {
          errors: { submit: data.message || 'Registration failed.' },
          values: payload
        });
      }

      // Optionally redirect after success
      throw redirect(303, '/');
    } catch (err: any) {
      return fail(500, {
        errors: { submit: 'Server error. Please try again.' },
        values: payload
      });
    }
  }
};