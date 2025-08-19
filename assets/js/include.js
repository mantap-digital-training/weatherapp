document.addEventListener("DOMContentLoaded", () => {
  const includes = document.querySelectorAll("[data-include]");
  let loaded = 0;

  includes.forEach(async el => {
    const file = el.getAttribute("data-include");
    try {
      const resp = await fetch(file);
      if (!resp.ok) throw new Error("Gagal memuat " + file);
      el.innerHTML = await resp.text();
    } catch (err) {
      el.innerHTML = "<p style='color:red'>Gagal memuat komponen: " + file + "</p>";
      console.error(err);
    }
    loaded++;
    if (loaded === includes.length) {
      // semua komponen sudah selesai dimuat
      document.dispatchEvent(new Event("componentsLoaded"));
    }
  });
});
