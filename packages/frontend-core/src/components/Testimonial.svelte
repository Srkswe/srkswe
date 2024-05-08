<script>
  import { Layout } from "@budibase/bbui"
  import Bulgaria from "../../assets/bulgaria.png"
  import Covanta from "../../assets/covanta.png"
  import Schnellecke from "../../assets/schnellecke.png"

  const testimonials = [
    {
      text: "The only person you should try to be better than is the person you were yesterday.",
      name: "Alex",
      role: "Director",
      image: Covanta,
      imageSize: 105,
    },
    {
      text: "We are alone cannot change the world, but we can cast a stone across the waters to create many ripples",
      name: "Annai terasa",
      role: "Our Mother",
      image: Bulgaria,
      imageSize: 49,
    },
    {
      text: "3 Words Win Win Again",
      name: "SRK",
      role: "IT",
      image: Schnellecke,
      imageSize: 141,
    },
  ]
  const testimonial = testimonials[Math.floor(Math.random() * 3)]
</script>

<div class="testimonial">
  <Layout noPadding gap="S">
    <img
      width={testimonial.imageSize}
      alt="a-happy-budibase-user"
      src={testimonial.image}
    />
    <div class="text">
      "{testimonial.text}"
    </div>
    <div class="author">
      <div class="name">{testimonial.name}</div>
      <div class="company">{testimonial.role}</div>
    </div>
  </Layout>
</div>

<style>
  .testimonial {
    width: 380px;
    padding: 40px;
  }
  .text {
    font-size: 20px;
    font-style: italic;
    color: black;
  }
  .name {
    font-weight: bold;
    color: var(--spectrum-global-color-gray-900);
    font-size: var(--font-size-l);
    color: black;
  }
  .company {
    color: var(--spectrum-global-color-gray-700);
    color: black;
  }
</style>
