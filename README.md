Home Setup

An AI-assisted mobile app that helps people set up a new home within their budget. The user describes their home, and Home Setup builds a prioritised shopping plan, fits it to the budget, and tracks purchases and expenses.

Features
*Home profile: home type (studio, apartment, house), furnishing status, number of people, bedrooms and living rooms, budget, move-in date, style, working from home, pets, garden or balcony, and items the user already owns.
*Layered planning: a rule-based template with researched reference prices builds the base plan. A generative AI model (Gemini) only suggests a few extra items specific to the home.
*Four priority levels: Essentials, Needed soon, Nice-to-haves, Optional extras.
*Budget fitting: Essentials always stay in the plan. Lower-priority items that do not fit the budget move to "Later" and come back automatically when the budget increases. Items the user postpones manually are left alone.
*Plan editing: add, remove, and edit items; mark them as planned, bought, owned, or later; choose between options for some items (for example a single sofa or a sofa set).
*Expense tracking: record the price actually paid, add unplanned expenses, and see Budget, Planned, Spent, Remaining, and setup progress.
*Store links: open Trendyol, Hepsiburada, or IKEA search pages directly from an item.
*Accounts: email and password sign-in, password reset email, log out, and account deletion with all user data.
*Security: Firestore rules are based on ownerId, so each user can only read and change their own data.
