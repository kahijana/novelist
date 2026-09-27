import { Book } from '../types/reader';
import { createNovelPdfBlob } from './pdfGenerator';

import sherlockCover from '../assets/images/cover_sherlock_holmes_1790522715534.jpg';
import prideCover from '../assets/images/cover_pride_prejudice_1790522728922.jpg';

export interface SampleBookDef {
  id: string;
  title: string;
  author: string;
  cover: string;
  chapters: { title: string; paragraphs: string[] }[];
}

export const SAMPLE_NOVELS: SampleBookDef[] = [
  {
    id: 'sample-sherlock-holmes',
    title: 'The Adventures of Sherlock Holmes',
    author: 'Sir Arthur Conan Doyle',
    cover: sherlockCover,
    chapters: [
      {
        title: 'I. A Scandal in Bohemia',
        paragraphs: [
          'To Sherlock Holmes she is always the woman. I have seldom heard him mention her under any other name. In his eyes she eclipses and predominates the whole of her sex. It was not that he felt any emotion akin to love for Irene Adler. All emotions, and that one particularly, were abhorrent to his cold, precise but admirably balanced mind. He was, I take it, the most perfect reasoning and observing machine that the world has seen, but as a lover he would have placed himself in a false position.',
          'He never spoke of the softer passions, save with a gibe and a sneer. They were admirable things for the observer—excellent for drawing the veil from men’s motives and actions. But for the trained reasoner to admit such intrusions into his own delicate and finely adjusted temperament was to introduce a distracting factor which might throw a doubt upon all his mental results. Grit in a sensitive instrument, or a crack in one of his own high-power lenses, would not be more disturbing than a strong emotion in a nature such as his.',
          'And yet there was but one woman to him, and that woman was the late Irene Adler, of dubious and questionable memory.',
          'I had seen little of Holmes lately. My marriage had drifted us away from each other. My own complete happiness, and the home-centred interests which rise up around the man who first finds himself master of his own establishment, were sufficient to absorb all my attention, while Holmes, who loathed every form of society with his whole Bohemian soul, remained in our lodgings in Baker Street, buried among his old books, and alternating from week to week between cocaine and ambition, the drowsiness of the drug, and the fierce energy of his own keen nature.',
          'One night—it was on the twentieth of March, 1888—I was returning from a journey to a patient (for I had now returned to civil practice), when my way led me through Baker Street. As I passed the well-remembered door, which must always be associated in my mind with my wooing, and with the dark incidents of the Study in Scarlet, I was seized with a keen desire to see Holmes again, and to know how he was employing his extraordinary powers.',
          'His rooms were brilliantly lit, and, even as I looked up, I saw his tall, spare figure pass twice in a dark silhouette against the blind. He was pacing the room swiftly, eagerly, with his head sunk upon his chest and his hands clasped behind him. To me, who knew his every mood and habit, his attitude and manner told their own story. He was at work again. He had risen out of his drug-created dreams and was hot upon the scent of some new problem. I rang the bell and was shown up to the chamber which had formerly been in part my own.',
          'His manner was not effusive. It seldom was; but he was glad, I think, to see me. With hardly a word spoken, but with a kindly eye, he waved me to an armchair, threw across his case of cigars, and indicated an acid-stained tantalus and a gasogene in the corner. Then he stood before the fire and looked me over in his singular introspective fashion.',
          '“Wedlock suits you,” he remarked. “I think, Watson, that you have put on seven and a half pounds since I saw you.”',
          '“Seven!” I answered.',
          '“Indeed, I should have thought a little more. Just a trifle more, I fancy, Watson. And in practice again, I observe. You did not tell me that you intended to go into harness.”',
          '“Then, how do you know?”',
          '“I see it, I deduce it. How do I know that you have been getting yourself very wet lately, and that you have a most clumsy and careless servant girl?”',
          '“My dear Holmes,” said I, “this is too much. You would certainly have been burned, had you lived a few centuries ago. It is true that I had a country walk on Thursday and came home in a dreadful mess, but as I have changed my clothes I can’t imagine how you deduce it. As to Mary Jane, she is incorrigible, and my wife has given her notice; but there, again, I fail to see how you work it out.”',
          'He chuckled to himself and rubbed his long, nervous hands together.',
          '“It is simplicity itself,” said he; “my eyes tell me that on the inside of your left shoe, just where the firelight strikes it, the leather is scored by six almost parallel cuts. Obviously they have been caused by someone who has very carelessly scraped round the edges of the sole in order to remove crusted mud from it. Hence, you see, my double deduction that you had been out in vile weather, and that you had a particularly malignant boot-slitting specimen of the London slavey. As to your practice, if a gentleman walks into my rooms smelling of iodoform, with a black mark of nitrate of silver upon his right forefinger, and a bulge on the right side of his top-hat to show where he has secreted his stethoscope, I must be dull indeed, if I do not pronounce him to be an active member of the medical profession.”',
        ],
      },
      {
        title: 'II. The Red-Headed League',
        paragraphs: [
          'I had called upon my friend, Mr. Sherlock Holmes, one day in the autumn of last year and found him in deep conversation with a very stout, florid-faced, elderly gentleman with fiery red hair. With an apology for my intrusion, I was about to withdraw when Holmes pulled me abruptly into the room and closed the door behind me.',
          '“You could not have come at a better time, my dear Watson,” he said cordially.',
          '“I was afraid that you were engaged.”',
          '“So I am. Very much so.”',
          '“Then I can wait in the next room.”',
          '“Not at all. This gentleman, Mr. Wilson, has been my partner and helper in many of my most successful cases, and I have no doubt that he will be of the utmost use to me in yours also.”',
          'The stout gentleman rose from his chair and gave a bob of greeting, with a quick little questioning glance from his small fat-encircled eyes.',
          '“Try the settee,” said Holmes, relapsing into his armchair and putting his fingertips together, as was his custom when in judicial moods. “I know, my dear Watson, that you share my love of all that is bizarre and outside the conventions and humdrum routine of everyday life. You have shown your relish for it by the enthusiasm which has prompted you to chronicle and, if you will excuse my saying so, somewhat to embellish so many of my little adventures.”',
          '“Your cases have indeed been of the greatest interest to me,” I observed.',
          '“You will remember that I remarked the other day, just before we went into the very simple problem presented by Miss Mary Sutherland, that for strange effects and extraordinary combinations we must go to life itself, which is always far more daring than any effort of the imagination.”',
          '“A proposition which I took the liberty of doubting.”',
          '“You did, Doctor, but nonetheless you must come round to my view, for otherwise I shall keep on piling fact upon fact on you until your reason breaks down under them and acknowledges me to be right. Now, Mr. Jabez Wilson here has been good enough to call upon me this morning, and to begin a narrative which promises to be one of the most singular which I have listened to for some time.”',
        ],
      },
      {
        title: 'III. A Case of Identity',
        paragraphs: [
          '“My dear fellow,” said Sherlock Holmes as we sat on either side of the fire in his lodgings at Baker Street, “life is infinitely stranger than anything which the mind of man could invent. We would not dare to conceive the things which are really mere commonplaces of existence. If we could fly out of that window hand in hand, hover over this great city, gently remove the roofs, and peep in at the queer things which are going on, the strange coincidences, the plannings, the cross-purposes, the wonderful chains of events, working through generations, and leading to the most outre results, it would make all fiction with its conventionalities and foreseen conclusions most stale and unprofitable.”',
          '“And yet I am not convinced of it,” I answered. “The cases which come to light in the papers are, as a rule, bald enough, and vulgar enough. We have in our police reports realism pushed to its extreme limits, and yet the result is, it must be confessed, neither fascinating nor artistic.”',
          '“A certain selection and discretion must be used in producing a realistic effect,” remarked Holmes. “This is wanting in the police report, where more stress is laid, perhaps, upon the platitudes of the magistrate than upon the details, which to an observer contain the vital essence of the whole matter. Depend upon it, there is nothing so unnatural as the commonplace.”',
          'I smiled and shook my head. “I can quite understand your thinking so,” I said. “Of course, in your position of unofficial adviser and helper to everybody who is absolutely puzzled, throughout three continents, you are brought in contact with all that is strange and fantastic. But here”—I picked up the morning paper from the ground—“let us put it to a practical test. Here is the first heading which I come to. ‘A husband’s cruelty to his wife.’ There is half a column of print, but I know without reading it that it is all perfectly familiar. There is, of course, the other woman, the drink, the push, the blow, the bruise, the sympathetic sister or landlady. The crudest of writers could invent nothing more crude.”',
        ],
      },
    ],
  },
  {
    id: 'sample-pride-prejudice',
    title: 'Pride and Prejudice',
    author: 'Jane Austen',
    cover: prideCover,
    chapters: [
      {
        title: 'Chapter 1',
        paragraphs: [
          'It is a truth universally acknowledged, that a single man in possession of a good fortune, must be in want of a wife.',
          'However little known the feelings or views of such a man may be on his first entering a neighbourhood, this truth is so well fixed in the minds of the surrounding families, that he is considered the rightful property of some one or other of their daughters.',
          '“My dear Mr. Bennet,” said his lady to him one day, “have you heard that Netherfield Park is let at last?”',
          'Mr. Bennet replied that he had not.',
          '“But it is,” returned she; “for Mrs. Long has just been here, and she told me all about it.”',
          'Mr. Bennet made no answer.',
          '“Do you not want to know who has taken it?” cried his wife impatiently.',
          '“You want to tell me, and I have no objection to hearing it.”',
          'This was invitation enough.',
          '“Why, my dear, you must know, Mrs. Long says that Netherfield is taken by a young man of large fortune from the north of England; that he came down on Monday in a chaise and four to see the place, and was so much delighted with it, that he agreed with Mr. Morris immediately; that he is to take possession before Michaelmas, and some of his servants are to be in the house by the end of next week.”',
          '“What is his name?”',
          '“Bingley.”',
          '“Is he married or single?”',
          '“Oh! Single, my dear, to be sure! A single man of large fortune; four or five thousand a year. What a fine thing for our girls!”',
          '“How so? How can it affect them?”',
          '“My dear Mr. Bennet,” replied his wife, “how can you be so tiresome! You must know that I am thinking of his marrying one of them.”',
          '“Is that his design in settling here?”',
          '“Design! Nonsense, how can you talk so! But it is very likely that he may fall in love with one of them, and therefore you must visit him as soon as he comes.”',
        ],
      },
      {
        title: 'Chapter 2',
        paragraphs: [
          'Mr. Bennet was among the earliest of those who waited on Mr. Bingley. He had always intended to visit him, though to the last always assuring his wife that he should not go; and till the evening after the visit was paid she had no knowledge of it. The disclosure was then made in the following manner. Observing his second daughter employed in trimming a hat, he suddenly addressed her with:',
          '“I hope Mr. Bingley will like it, Lizzy.”',
          '“We are not in a way to know what Mr. Bingley likes,” said her mother resentfully, “since we are not to visit.”',
          '“But you forget, mamma,” said Elizabeth, “that we shall meet him at the assemblies, and that Mrs. Long has promised to introduce him.”',
          '“I do not believe Mrs. Long will do any such thing. She has two nieces of her own. She is a selfish, hypocritical woman, and I have no opinion of her.”',
          '“No more have I,” said Mr. Bennet; “and I am glad to find that you do not depend on her serving you.”',
          'Mrs. Bennet deigned not to make any reply, but, unable to contain herself, began scolding one of her daughters.',
          '“Don’t keep coughing so, Kitty, for Heaven’s sake! Have a little compassion on my nerves. You tear them to pieces.”',
          '“Kitty has no discretion in her coughs,” said her father; “she times them ill.”',
          '“I do not cough for my own amusement,” replied Kitty fretfully. “When is your next ball to be, Lizzy?”',
          '“To-morrow fortnight.”',
          '“Aye, so it is,” cried her mother, “and Mrs. Long does not come back till the day before; so it will be impossible for her to introduce him, for she will not know him herself.”',
          '“Then, my dear, you may have the advantage of your friend, and introduce Mr. Bingley to her.”',
          '“Impossible, Mr. Bennet, impossible, when I am not acquainted with him myself; how can you be so teasing?”',
          '“I honour your circumspection. A fortnight’s acquaintance is certainly very little. One cannot know what a man really is by the end of a fortnight. But if we do not venture somebody else will; and after all, Mrs. Long and her daughters must stand their chance; and, therefore, as she will think it an act of kindness, if you decline the office, I will take it on myself.”',
        ],
      },
      {
        title: 'Chapter 3',
        paragraphs: [
          'Not all that Mrs. Bennet, however, with the assistance of her five daughters, could ask on the subject, was sufficient to draw from her husband any satisfactory description of Mr. Bingley. They attacked him in various ways—with barefaced questions, ingenious suppositions, and distant surmises; but he eluded the skill of them all, and they were at last obliged to accept the second-hand intelligence of their neighbour, Lady Lucas. Her report was highly favourable. Sir William had been delighted with him. He was quite young, wonderfully handsome, extremely agreeable, and, to crown the whole, he meant to be at the next assembly with a large party.',
          'Nothing could be more delightful! To be fond of dancing was a certain step towards falling in love; and very lively hopes of Mr. Bingley’s heart were entertained.',
          '“If I can but see one of my daughters happily settled at Netherfield,” said Mrs. Bennet to her husband, “and all the others equally well married, I shall have nothing to wish for.”',
          'In a few days Mr. Bingley returned Mr. Bennet’s visit, and sat about ten minutes with him in his library. He had entertained hopes of being admitted to a sight of the young ladies, of whose beauty he had heard much; but he saw only the father. The ladies were somewhat more fortunate, for they had the advantage of ascertaining from an upper window that he wore a blue coat, and rode a black horse.',
          'An invitation to dinner was soon afterwards dispatched; and already had Mrs. Bennet planned the courses that were to do credit to her housekeeping, when an answer arrived which deferred it all. Mr. Bingley was obliged to be in town the following day, and, consequently, unable to accept the honour of their invitation. Mrs. Bennet was quite disconcerted. She could not imagine what business he could have in town so soon after his arrival in Hertfordshire.',
        ],
      },
    ],
  },
];

export async function createSampleBookInstances(): Promise<Book[]> {
  const books: Book[] = [];
  const now = Date.now();

  for (let index = 0; index < SAMPLE_NOVELS.length; index++) {
    const sample = SAMPLE_NOVELS[index];
    const blob = createNovelPdfBlob(sample.title, sample.author, sample.chapters);

    // Calculate approximate pages (based on chapter content)
    let totalEstimatedPages = 1; // cover
    const chaptersOutline = sample.chapters.map((ch, chIdx) => {
      const pageStart = totalEstimatedPages + 1;
      const lines = ch.paragraphs.reduce((acc, p) => acc + Math.ceil(p.length / 64) + 1, 0);
      const pagesSpan = Math.max(1, Math.ceil(lines / 36));
      totalEstimatedPages += pagesSpan;
      return {
        id: `ch-${sample.id}-${chIdx}`,
        title: ch.title,
        page: pageStart,
        level: 1,
      };
    });

    books.push({
      id: sample.id,
      title: sample.title,
      author: sample.author,
      cover: sample.cover,
      fileBlob: blob,
      fileSize: blob.size,
      totalPages: totalEstimatedPages,
      createdAt: now - (index + 1) * 3600 * 1000 * 24,
      lastReadAt: index === 0 ? now - 15 * 60 * 1000 : now - 2 * 3600 * 1000 * 24,
      isSample: true,
      sampleContentKey: sample.id,
      chapters: [
        { id: `cover-${sample.id}`, title: 'Title & Cover', page: 1, level: 0 },
        ...chaptersOutline,
      ],
    });
  }

  return books;
}
