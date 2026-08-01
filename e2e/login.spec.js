import { test, expect } from '@playwright/test';

test('login screen should display email field and sign-in button', async ({ page }) => {
  // 1. Open the home page.
  // The AuthGate component will render the login page if the user is not authenticated.
  await page.goto('/');

  // 2. Verify the email field is visible.
  // We use getByLabel because the input is wrapped in a <label> that contains the text "Email address".
  const emailField = page.getByLabel('Email address');
  await expect(emailField).toBeVisible();

  // 3. Verify the sign-in button is visible.
  // We scope the search to the form to avoid matching the "Sign in" tab button.
  const signInButton = page.locator('form').getByRole('button', { name: 'Sign in' });
  await expect(signInButton).toBeVisible();

  // 4. Verify the login page container is present.
  // This uses the data-testid defined in AuthGate.vue.
  const loginPage = page.getByTestId('login-page');
  await expect(loginPage).toBeVisible();
});

test('login form should require email and password', async ({ page }) => {
  await page.goto('/');

  const emailField = page.getByLabel('Email address');
  const passwordField = page.getByLabel('Password');
  const signInButton = page.locator('form').getByRole('button', { name: 'Sign in' });

  // 1. Verify that the fields have the 'required' attribute in the DOM.
  await expect(emailField).toHaveAttribute('required', '');
  await expect(passwordField).toHaveAttribute('required', '');

  // 2. Attempt to trigger browser's native validation without submitting.
  // We use checkValidity() which returns false if the form is invalid.
  const isFormValidInitial = await page.locator('form').evaluate(form => form.checkValidity());
  expect(isFormValidInitial).toBe(false);

  // 3. Verify that the email field is invalid (empty).
  const isEmailValid = await emailField.evaluate(el => el.validity.valid);
  expect(isEmailValid).toBe(false);

  // 4. Fill email but leave password empty, then check validity again.
  await emailField.fill('test@example.com');
  const isFormValidAfterEmail = await page.locator('form').evaluate(form => form.checkValidity());
  expect(isFormValidAfterEmail).toBe(false);

  // Now the email is valid, but the password should be invalid.
  const isEmailValidAfter = await emailField.evaluate(el => el.validity.valid);
  const isPasswordValidAfter = await passwordField.evaluate(el => el.validity.valid);
  
  expect(isEmailValidAfter).toBe(true);
  expect(isPasswordValidAfter).toBe(false);
});

test('login form should validate email format', async ({ page }) => {
  await page.goto('/');

  const emailField = page.getByLabel('Email address');
  const passwordField = page.getByLabel('Password');
  const signInButton = page.locator('form').getByRole('button', { name: 'Sign in' });

  // 1. Enter an invalid email format.
  await emailField.fill('not-an-email');
  await passwordField.fill('password123');

  // 2. Trigger validation without submitting.
  const isFormValid = await page.locator('form').evaluate(form => form.checkValidity());
  expect(isFormValid).toBe(false);

  // 3. Verify that the email field is invalid due to type="email" validation.
  const isEmailValid = await emailField.evaluate(el => el.validity.valid);
  expect(isEmailValid).toBe(false);
});

test('login form should toggle password visibility', async ({ page }) => {
  await page.goto('/');

  const passwordField = page.getByLabel('Password');
  
  // 1. Confirm the password field initially hides the entered text (type="password").
  await expect(passwordField).toHaveAttribute('type', 'password');

  // 2. Enter a test password.
  await passwordField.fill('secret-password-123');

  // 3. Click the "Show" button to reveal the password.
  const showButton = page.getByRole('button', { name: 'Show' });
  await showButton.click();

  // 4. Confirm the password becomes visible (type="text").
  await expect(passwordField).toHaveAttribute('type', 'text');

  // 5. Click the "Hide" button (text should have changed) and confirm it is hidden again.
  const hideButton = page.getByRole('button', { name: 'Hide' });
  await hideButton.click();
  await expect(passwordField).toHaveAttribute('type', 'password');
});

test('should switch between Sign in and Create account views', async ({ page }) => {
  await page.goto('/');

  // 1. Verify initial "Sign in" state.
  const signInSubmitButton = page.locator('form').getByRole('button', { name: 'Sign in' });
  const fullNameField = page.getByLabel('Full name');
  
  await expect(signInSubmitButton).toBeVisible();
  await expect(fullNameField).not.toBeVisible();

  // 2. Switch to "Create account".
  const createAccountTab = page.getByRole('button', { name: 'Create account' });
  await createAccountTab.click();

  // 3. Verify registration form elements.
  const createAccountSubmitButton = page.locator('form').getByRole('button', { name: 'Create account' });
  await expect(createAccountSubmitButton).toBeVisible();
  await expect(fullNameField).toBeVisible();

  // 4. Switch back to "Sign in".
  const signInTab = page.getByRole('button', { name: 'Sign in', exact: true }).and(page.locator(':not(form *)'));
  await signInTab.click();

  // 5. Verify return to login view.
  await expect(signInSubmitButton).toBeVisible();
  await expect(fullNameField).not.toBeVisible();
});

test('forgot password button should require an email address', async ({ page }) => {
  await page.goto('/');

  const forgotPasswordButton = page.getByRole('button', { name: 'Forgot your password?' });
  const emailField = page.getByLabel('Email address');

  // 1. Verify the button is visible but disabled when email is empty.
  await expect(forgotPasswordButton).toBeVisible();
  await expect(forgotPasswordButton).toBeDisabled();

  // 2. Enter an email address.
  await emailField.fill('test@example.com');

  // 3. Verify the button is now enabled.
  await expect(forgotPasswordButton).toBeEnabled();

  // 4. Click the button and verify the success message.
  // We mock the Supabase call implicitly by checking the UI response defined in AuthGate.vue.
  await forgotPasswordButton.click();
  
  const successMessage = page.getByText('Check your email for the password reset link.');
  await expect(successMessage).toBeVisible();
});

test('should show an error message on failed sign-in', async ({ page }) => {
  // 1. Intercept the Supabase authentication request and mock a failure.
  await page.route('**/auth/v1/token*', async route => {
    if (route.request().method() === 'POST') {
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({
          error: 'invalid_grant',
          error_description: 'Invalid login credentials'
        })
      });
    } else {
      await route.continue();
    }
  });

  await page.goto('/');

  const emailField = page.getByLabel('Email address');
  const passwordField = page.getByLabel('Password');
  const signInButton = page.locator('form').getByRole('button', { name: 'Sign in' });

  // 2. Fill with dummy credentials.
  await emailField.fill('wrong@example.com');
  await passwordField.fill('wrong-password');

  // 3. Submit the form.
  await signInButton.click();

  // 4. Verify that the error message from the mocked response is displayed.
  const errorMessage = page.getByText('Invalid login credentials');
  await expect(errorMessage).toBeVisible();

  // 5. Verify the user remains on the login screen.
  await expect(page.getByTestId('login-page')).toBeVisible();
});

test('should show loading state and disable button during sign-in', async ({ page }) => {
  let resolveRoute;
  const routePromise = new Promise(resolve => {
    resolveRoute = resolve;
  });

  // 1. Intercept and delay the authentication request.
  await page.route('**/auth/v1/token*', async route => {
    if (route.request().method() === 'POST') {
      // Wait for the test to signal completion.
      await routePromise;
      await route.fulfill({
        status: 401,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'invalid_grant', error_description: 'Invalid credentials' })
      });
    } else {
      await route.continue();
    }
  });

  await page.goto('/');

  const emailField = page.getByLabel('Email address');
  const passwordField = page.getByLabel('Password');
  // Use a stable locator that doesn't depend on the changing button text
  const submitButton = page.locator('form button[type="submit"]');

  await emailField.fill('test@example.com');
  await passwordField.fill('password123');

  // 2. Submit the form.
  await submitButton.click();

  // 3. Verify loading state while request is pending.
  // The button text should change and the button should be disabled.
  await expect(submitButton).toHaveText('Please wait…');
  await expect(submitButton).toBeDisabled();

  // 4. Resolve the route to finish the request.
  resolveRoute();

  // 5. Verify it returns to the normal state (Sign in mode).
  await expect(submitButton).toHaveText('Sign in');
  await expect(submitButton).toBeEnabled();
});
