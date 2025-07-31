Using the world ranking data, the script calculates a score for the PR based on a formula that considers three key factors:

Percentile Jump & Z-Score: It calculates the competitor's old and new world ranking percentile and converts this "jump" into a Z-Score. This rewards improvements made at a higher skill level more heavily.

Popularity Weight: It gives a higher weight to PRs in more popular events (like 3x3x3) where the competitor field is larger and more competitive.

Difficulty Weight: It applies a manual bonus multiplier for events that are generally considered more difficult, such as 6x6x6 or Blindfolded events.

After calculating a score for every single PR, the script does two things:
It adds up the scores for each person to get their total improvement score.
It prints a detailed, sorted list to the terminal, showing the final ranking and a breakdown of each person's improvements.
It saves this detailed report as a structured output.json file for easy access and sharing.



Score Formula:
Score = (Z-Score Difference) * (Popularity Weight) * (Difficulty Weight) * 100
Z-Score Difference: This measures the statistical significance of the improvement. A jump from the 98th to the 99th percentile is much harder than a jump from the 50th to the 51st, and this part of the formula gives a much higher value to the higher-level improvement.
Popularity Weight: This is calculated as log10(total competitors). It scales the score to reflect the size of the competitive field, giving more weight to PRs in more popular events.
Difficulty Weight: This is a manually set multiplier (e.g., 1.3 for 6x6x6) that gives a bonus for improvements in events that are considered more complex or challenging.
Multiplier (100): This is simply to make the final scores a more readable number (e.g., 150 instead of 1.5).


Steps:
Place the Data: Put the competition's wcif.json file in the main project folder.
Compile the Code: Open a terminal in the project folder and run the command tsc.
Run the Script: Run the command node .dist/index.js. 



Improvement for each person (Ex output 1):
Improvement for Aiden Ravelo in 333 (single):
  23.22s -> 19.49s
  Percentile: 83.97% -> 87.07%
  Score: +55.70
Explanation:
333 (single): This tells you the PR was for the 3x3x3 Cube event, and it was for a single solve, not an average.
Single: A competitor's fastest individual solve in a round.
Average: A competitor's average time over 5 solves (after removing the fastest and slowest times).

23.22s -> 19.49s: This shows his old personal best was 23.22 seconds, and his new personal best is now 19.49 seconds.

Percentile: 83.97% -> 87.07% (Most important part): 
His old time was faster than 83.97% of all the ranked cubers in the world.
His new, faster time is now better than 87.07% of all ranked cubers.
By getting this PR, he jumped over 3.1% of the world's competitors. This significant jump is why he gets a good score.

Score: +55.70: This is the final score calculated for this one specific PR. This number is then added to Aiden's total score for the competition.



Final PR Ranking (Example output 2):
Miguel Diaz               : 1202.70
  - 333     (average): 11.96 -> 11.37 (+18.78)
  - 333     (single ): 10.51 -> 9.97 (+17.11)
  - 555     (average): 84.75 -> 78.59 (+83.91)
  - 555     (single ): 74.28 -> 69.71 (+59.20)
  - 666     (average): 210.83 -> 146.47 (+503.95)
  - 666     (single ): 204.69 -> 131.54 (+519.76)

- This is the most important line for the ranking. It shows Miguel's Total Improvement Score for the entire competition. This number is the sum of all the individual scores listed below it (18.78 + 17.11 + 83.91 + 59.20 + 503.95 + 519.76 = 1202.71, with a tiny rounding difference). Because his total score was the highest, he is ranked #1.

In simple terms, this section shows that Miguel Diaz is ranked first because he broke six different personal records, with his massive improvements in 6x6x6 earning him the most points and securing his top spot.
