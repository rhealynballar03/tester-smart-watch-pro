# 3D Landmark Scroll Animation Plan + Claude Code Prompts

This guide is tailored to the current workspace structure in the Tester product site. It assumes you are working from the project root and will add a new page called Sights.html plus a dark, scroll-driven landmark showcase experience.

## Project Goal
Create a new experience that:
- adds a new page named Sights.html
- links to it from the landing page
- uses a dark, cinematic theme
- shows a landmark transformation from line-art blueprint to a finished architectural design
- uses a scroll animation built from video frames or image frames
- stays responsive on mobile

## Files to Use
- Existing landing page: [index.html](index.html)
- Existing styling: [css/style.css](css/style.css)
- Existing JavaScript patterns: [js/app.js](js/app.js)
- Existing reference pages: [product.html](product.html) and [anything.html](anything.html)
- Existing design notes: [md_extracted/MD Files/FRONT END.md](md_extracted/MD%20Files/FRONT%20END.md)
- Existing video-to-website notes: [md_extracted/MD Files/VIDEO TO WEBSITE.md](md_extracted/MD%20Files/VIDEO%20TO%20WEBSITE.md)

---

## Step-by-Step Implementation

### Step 1: Create the New Page
Create a new file named Sights.html in the project root.

Requirements:
- Use a dark cinematic look
- Match the existing premium, minimal, editorial style of the site
- Include a hero section for the landmark animation
- Include a scroll section where frames change as the user scrolls
- Make sure the page is responsive and mobile-friendly

Suggested structure:
- hero section with title and short intro
- animated landmark section with a fixed viewport and scroll-driven image progression
- a short content section explaining the concept
- a button or link back to the home page

### Step 2: Link It From the Landing Page
Open [index.html](index.html) and add:
- a new section or card in the main navigation or content area
- a button or CTA labeled something like “Explore Sights”
- a link that goes to Sights.html

Keep it visually consistent with the dark, premium brand style already used in the landing page.

### Step 3: Prepare the Landmark Concept
Use La Sagrada Familia as the first example if you want to follow the assignment closely.

Concept:
- Start frame: blueprint line-art version
- Middle frames: transition into a completed imaginative design
- Final frame: dark, finished building

Use a dark theme so the visuals feel cohesive and dramatic.

### Step 4: Generate Images for the Transition
Create or gather these assets:
- start image: blueprint/line-art version
- end image: completed design
- optional middle frames if you want a smoother progression

Recommended folder:
- [assets](assets) or a new folder such as [assets/sights](assets)

Name files clearly:
- landmark-start.png
- landmark-end.png
- landmark-frame-001.png
- landmark-frame-002.png

### Step 5: Generate the Transition Video
Use a video generation tool such as Kie.ai Video Generation.

Best practice:
- upload the start frame and the end frame
- generate a short transition video
- keep it around 5 seconds
- do not add motion effects, audio, or extra camera movement
- keep it simple and focused on the transformation

The transition video should be used as the base for the scroll animation.

### Step 6: Extract Scroll Frames with FFmpeg
Use FFmpeg to extract frames from the transition video.

Example PowerShell command:

```powershell
ffmpeg -i "landmark-transition.mp4" -vf "fps=12,scale=1280:-1" -c:v libwebp -quality 80 frames/frame_%04d.webp
```

Then use those frames in the scroll animation.

Recommended frame count:
- 40 to 120 frames is usually enough for a smooth effect
- keep the number reasonable so the page performs well

### Step 7: Build the Scroll Animation
Use the extracted frames to create a scroll-based experience.

The page should:
- display the first frame by default
- progressively swap to later frames as the user scrolls down
- keep the animation smooth and readable
- avoid breaking on mobile screens

You can implement this with:
- HTML for structure
- CSS for layout, dark styling, and responsive behavior
- JavaScript for frame switching based on scroll position

### Step 8: Replace the Example With Your Own Landmark
After the first version works, create your own landmark concept.

Good choices include:
- a famous building
- a statue
- an architectural wonder
- another world landmark

Repeat the same process:
- blueprint image
- final design image
- transition video
- frame extraction
- integration into the page

### Step 9: Polish for Responsive Design
Make sure the page includes:
- readable font sizes
- comfortable spacing
- mobile-friendly tap targets
- no horizontal overflow
- a good layout for narrow screens

---

## Claude Code Prompts

Use these prompts directly in Claude Code.

### Prompt 1: Create the new page
Copy and paste this into Claude Code:

```text
Create a new file named Sights.html in the project root for a dark, cinematic landmark scroll animation page. Use the same premium visual language as the existing site in index.html and style.css. The page should include:
- a dark hero section with a bold title
- a scroll-driven landmark transformation section
- a short intro and a back link to the home page
- responsive layout for mobile and desktop
- semantic HTML and accessible structure

Use a black or dark theme and keep the design elegant, minimal, and editorial.
```

### Prompt 2: Add a button from the landing page
```text
Update index.html to add a new section or CTA that links to Sights.html. Make the button visually consistent with the existing site and place it in a logical location near the main navigation or hero area. Keep the styling consistent with the existing dark luxury aesthetic.
```

### Prompt 3: Build the landmark animation section
```text
In Sights.html, create a scroll-based landmark animation experience. The page should show a landmark transformation from a blueprint line-art style to a complete finished design. Use a dark background, a dramatic layout, and smooth scroll interaction. Make sure the animation feels premium and polished, not generic.
```

### Prompt 4: Add frame-based scroll animation
```text
Implement a scroll interaction on Sights.html where the page changes through multiple frames as the user scrolls. Use JavaScript to update the displayed frame based on scroll progress. Make it work smoothly on desktop and mobile. If frame images are not yet available, create a simple placeholder structure that can later be swapped with real assets.
```

### Prompt 5: Generate the image and video prompt
```text
Create a strong prompt for image generation and video generation for a landmark transformation. The first concept should be La Sagrada Familia. The start image should be a blueprint line-art version, and the end image should be a fully completed, imaginative, dark finished design. Keep the transition simple, cinematic, and focused only on the transformation. Avoid camera movement, audio, and unnecessary effects.
```

### Prompt 6: Help with FFmpeg frame extraction
```text
Help me extract frames from a short transition video using FFmpeg in Windows PowerShell. Create a simple command that takes an input MP4 and outputs a sequence of WebP or JPG frames for use in a scroll animation. Make the command suitable for this project and keep the output resolution reasonable for web performance.
```

### Prompt 7: Replace with a custom landmark
```text
Replace the example landmark with my own landmark concept. Generate a blueprint start frame and a completed final frame for the new landmark. Then integrate them into Sights.html and make sure the page still feels cohesive with the dark visual style.
```

### Prompt 8: Polish for responsive quality
```text
Review the Sights.html page and make it fully responsive. Ensure the layout works well on mobile screens, uses readable typography, avoids horizontal overflow, and keeps interactive elements comfortably sized. Make the scroll experience feel smooth and polished without breaking on smaller screens.
```

---

## Suggested Asset Workflow
1. Generate the start image
2. Generate the end image
3. Generate the transition video
4. Extract frames with FFmpeg
5. Place assets in the project assets folder
6. Add them into Sights.html
7. Test the scroll effect on desktop and mobile
8. Replace the example landmark with your own concept

---

## Raven Recording Checklist
Use this checklist while recording your work:

- [ ] Front-End Design
- [ ] Mobile View Version
- [ ] Products HTML
- [ ] 3D Scrolling Effect

### What to show in the recording
- the new Sights.html page
- the button linking from the landing page
- the dark visual style
- the scroll animation in action
- the mobile version behaving correctly

---

## Recommended Final Deliverables
- Sights.html created and linked from the home page
- a dark cinematic landmark animation experience
- at least one scroll-triggered 3D or depth interaction
- responsive behavior checked on mobile
- generated images and video assets uploaded into the project
