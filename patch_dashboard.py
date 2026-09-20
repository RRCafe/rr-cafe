import re

with open('apps/delivery/src/pages/Dashboard.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

target = """  async function toggleStatus() {
    if (!user) return;
    const newStatus = status === 'online' ? 'offline' : 'online';
    setStatus(newStatus);
    await supabase.from('delivery_partners').update({ status: newStatus }).eq('id', user.id);
  }"""

replace = """  async function toggleStatus() {
    if (!user || status === 'suspend') return;
    const newStatus = status === 'online' ? 'offline' : 'online';
    const oldStatus = status;
    setStatus(newStatus);
    const { error } = await supabase.from('delivery_partners').update({ status: newStatus }).eq('id', user.id);
    if (error) {
      setStatus(oldStatus);
      console.error('Update failed:', error);
    }
  }"""

content = content.replace(target, replace)

with open('apps/delivery/src/pages/Dashboard.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
