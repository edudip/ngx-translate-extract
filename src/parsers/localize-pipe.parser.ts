import { ParserInterface } from './parser.interface';
import { TranslationCollection } from '../utils/translation.collection';
import { isPathAngularComponent, extractComponentInlineTemplate } from '../utils/utils';

export class LocalizePipeParser implements ParserInterface {

	protected prefix: string = 'ROUTES.';

	public constructor(options?: any) {
		if (options && typeof options.prefix !== 'undefined') {
			this.prefix = options.prefix;
		}
	}

	public extract(template: string, path: string): TranslationCollection {
		if (path && isPathAngularComponent(path)) {
			template = extractComponentInlineTemplate(template);
		}

		return this.parseTemplate(template);
	}

	protected parseTemplate(template: string): TranslationCollection {
		let collection: TranslationCollection = new TranslationCollection();

		// [routerLink]="['/super' | localize ]"
		const regExp1 = /(['"`])([\s*\[\s*])?\s*['"`][\/]?((?:(?!\1).|\\\1)+)['"`]\s*\|\s*localize\s*\]/g;
		// [routerLink]="['/super' | localize ]"
		const regExp2 = /(['"`])([\s*\[\s*])?\s*(['"`](?:(?!\1).|\\\1)+['"`]\s*)+\]\s*\|\s*localize/g;
		// '/webinar-bearbeiten', webinar.id, 'teilnehmer-anschreiben'
		const regExp3 = /[\/]?\'\/?([a-z-]+)+/g;

		let matches1: RegExpExecArray, matches2: RegExpExecArray, matches3: RegExpExecArray;
		while (matches1 = regExp1.exec(template)) {
			collection = collection.add(this.prefix + matches1[3]);
		}
		while (matches2 = regExp2.exec(template)) {
			while (matches3 = regExp3.exec(matches2[3])) {
				collection = collection.add(this.prefix + matches3[1]);
			}
		}

		return collection;
	}
}
