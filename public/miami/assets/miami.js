(() => {
  const SUPABASE_URL = "https://wzofuvxsvomntglezygh.supabase.co";
  const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6b2Z1dnhzdm9tbnRnbGV6eWdoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk2NTA5ODEsImV4cCI6MjA4NTIyNjk4MX0.tk15_O5FOXzomBLJA08ldvdzN5yk99kK29Vvpvsuvb8";
  const MIAMI_REQUEST_URL = SUPABASE_URL + "/functions/v1/miami-request";

  // Sticky header border once scrolled
  const top = document.getElementById("top");
  const onScroll = () => top.classList.toggle("is-scrolled", window.scrollY > 8);
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  // Scroll reveal
  const io =
    "IntersectionObserver" in window &&
    new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("in");
            io.unobserve(e.target);
          }
        });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 },
    );
  document.querySelectorAll(".reveal").forEach((el) => (io ? io.observe(el) : el.classList.add("in")));

  const dayInputs = [...document.querySelectorAll("#dayChips input")];
  const form = document.getElementById("coffeeForm");
  const wrap = document.getElementById("formWrap");
  const btn = document.getElementById("submitBtn");

  form.addEventListener("submit", async (ev) => {
    ev.preventDefault();
    wrap.classList.remove("is-error");
    if (!form.checkValidity()) {
      form.querySelectorAll(":invalid").forEach((el) => el.dispatchEvent(new Event("blur")));
      form.reportValidity();
      return;
    }

    const honeypot = form.querySelector('[name="email_address_check"]');
    if (honeypot && honeypot.value) return; // bot

    const days = dayInputs.filter((i) => i.checked).map((i) => i.value);
    const time = form.querySelector('input[name="_time"]:checked');
    const place = form.querySelector('input[name="_place"]:checked');
    const consentEl = form.querySelector('input[name="OPT_IN"]');

    const payload = {
      nombre: document.getElementById("f-nombre").value.trim(),
      apellidos: document.getElementById("f-apellidos").value.trim(),
      email: document.getElementById("f-email").value.trim(),
      whatsapp: document.getElementById("f-wa").value.trim(),
      studio: document.getElementById("f-studio").value.trim(),
      cargo: document.getElementById("f-cargo").value.trim(),
      rubro: document.getElementById("f-rubro").value.trim(),
      web: document.getElementById("f-web").value.trim(),
      dias: days,
      horario: time ? time.value : "",
      lugar: place ? place.value : "",
      nota: document.getElementById("f-note").value.trim(),
      consent: Boolean(consentEl && consentEl.checked),
      website_hp: honeypot ? honeypot.value : "",
    };

    btn.disabled = true;
    try {
      const res = await fetch(MIAMI_REQUEST_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: SUPABASE_ANON_KEY,
          Authorization: "Bearer " + SUPABASE_ANON_KEY,
        },
        body: JSON.stringify(payload),
      });
      let body = null;
      try {
        body = await res.json();
      } catch (_e) {
        /* ignore */
      }
      if (!res.ok || (body && body.error)) {
        throw new Error((body && body.error) || "Request failed");
      }
      wrap.classList.add("is-sent");
      wrap.scrollIntoView({ behavior: "smooth", block: "center" });
    } catch (err) {
      wrap.classList.add("is-error");
      btn.disabled = false;
    }
  });
})();
