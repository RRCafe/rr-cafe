import re

def add_swr_to_file(filepath, state_name, fetch_func, set_state_func):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Add module-level cache variable
    cache_var = f"let cached_{state_name}: any = null;"
    if cache_var not in content:
        # insert after imports
        imports_end = content.rfind("import")
        imports_end = content.find("\n", imports_end) + 1
        content = content[:imports_end] + f"\n{cache_var}\n" + content[imports_end:]

    # Modify the fetch function to update the cache
    if "setLoading(false);" in content:
        content = content.replace(f"{set_state_func}(data", f"cached_{state_name} = data;\n      {set_state_func}(data")
    else:
        # For LiveOrders where setLoading might not exist
        content = content.replace(f"{set_state_func}(data", f"cached_{state_name} = data;\n        {set_state_func}(data")

    # Modify the useEffect to use the cache
    if "fetch" in fetch_func:
        use_effect_target = f"{fetch_func}();"
        use_effect_replace = f"""if (cached_{state_name}) {{
      {set_state_func}(cached_{state_name});
      {fetch_func}(); // background refresh
    }} else {{
      {fetch_func}();
    }}"""
        if use_effect_replace not in content:
            content = content.replace(use_effect_target, use_effect_replace, 1)

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

# Apply to Admin App
add_swr_to_file('apps/admin/src/pages/LiveOrders.tsx', 'orders', 'fetchOrders', 'setOrders')
add_swr_to_file('apps/admin/src/pages/MenuManager.tsx', 'items', 'fetchItems', 'setItems')
add_swr_to_file('apps/admin/src/pages/DeliveryPartners.tsx', 'partners', 'fetchPartners', 'setPartners')

