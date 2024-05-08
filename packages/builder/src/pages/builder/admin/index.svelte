<script>
  import {
    Button,
    Heading,
    notifications,
    Layout,
    Body,
    FancyForm,
    FancyInput,
  } from "@budibase/bbui"
  import { goto } from "@roxi/routify"
  import { API } from "api"
  import { admin, auth } from "stores/portal"
  import Logo from "assets/Fotoram.io (2).png"
  import { TestimonialPage } from "@budibase/frontend-core/src/components"
  import { passwordsMatch, handleError } from "../auth/_components/utils"

  let form
  let errors = {}
  let formData = {}
  let submitted = false

  $: tenantId = $auth.tenantId

  async function save() {
    form.validate()
    if (Object.keys(errors).length > 0) {
      return
    }
    submitted = true
    try {
      let adminUser = { ...formData, tenantId }
      delete adminUser.confirmationPassword
      // Save the admin user
      await API.createAdminUser(adminUser)
      notifications.success("Admin user created")
      await admin.init()
      $goto("../portal")
    } catch (error) {
      submitted = false
      notifications.error(error.message || "Failed to create admin user")
    }
  }
</script>

<TestimonialPage>
  <Layout gap="M" noPadding>
    <Layout justifyItems="center" noPadding>
      <img alt="logo" src={Logo} />
      <Heading size="M">Create a Admin Page</Heading>
      <Body>Lets Connect With Carenty</Body>
    </Layout>
    <Layout gap="S" noPadding>
      <FancyForm bind:this={form}>
        <FancyInput
          label="Email"
          value={formData.email}
          on:change={e => {
            formData = {
              ...formData,
              email: e.detail,
            }
          }}
          validate={() => {
            let fieldError = {
              email: !formData.email ? "Please enter a valid email" : undefined,
            }
            errors = handleError({ ...errors, ...fieldError })
          }}
          disabled={submitted}
          error={errors.email}
        />
        <FancyInput
          label="Password"
          value={formData.password}
          type="password"
          on:change={e => {
            formData = {
              ...formData,
              password: e.detail,
            }
          }}
          validate={() => {
            let fieldError = {}

            fieldError["password"] = !formData.password
              ? "Please enter a password"
              : undefined

            fieldError["confirmationPassword"] =
              !passwordsMatch(
                formData.password,
                formData.confirmationPassword
              ) && formData.confirmationPassword
                ? "Passwords must match"
                : undefined

            errors = handleError({ ...errors, ...fieldError })
          }}
          error={errors.password}
          disabled={submitted}
        />
        <FancyInput
          label="Repeat Password"
          value={formData.confirmationPassword}
          type="password"
          on:change={e => {
            formData = {
              ...formData,
              confirmationPassword: e.detail,
            }
          }}
          validate={() => {
            let fieldError = {
              confirmationPassword:
                !passwordsMatch(
                  formData.password,
                  formData.confirmationPassword
                ) && formData.password
                  ? "Passwords must match"
                  : undefined,
            }
            errors = handleError({ ...errors, ...fieldError })
          }}
          error={errors.confirmationPassword}
          disabled={submitted}
        />
      </FancyForm>
    </Layout>
    <Layout gap="XS" noPadding justifyItems="center">
      <Button
        cta
        size="L"
        disabled={Object.keys(errors).length > 0 || submitted}
        on:click={save}
        style="background-color: pink; color: white;"
      >
        Create Admin user
      </Button>
    </Layout>
  </Layout>
</TestimonialPage>

<style>
  img {
    width: 60px;
  }
</style>
