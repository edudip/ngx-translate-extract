import { ParserInterface } from './parser.interface';
import { TranslationCollection } from '../utils/translation.collection';
import { isPathAngularComponent, extractComponentInlineTemplate } from '../utils/utils';

export class RoutesParser implements ParserInterface {

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

		let filePath = '/src/app/app.routes.ts';

		if (path.substring(path.length - filePath.length) != filePath) {
			return new TranslationCollection();;
		}

		return this.parseTemplate(template);
	}

	protected parseTemplate(template: string): TranslationCollection {
		let collection = new TranslationCollection();
		let self = this, matches: RegExpMatchArray;

		// path: 'funktionen'
		const regExp: RegExp = /path\s*\:\s*['"`]([a-zA-Z1-2]+[^'"`]+)/g;

		while (matches = regExp.exec(template)) {
			let segments = matches[1].split('/');

			segments.forEach(function(value) {
				if (value.substring(0,1) == ':') {
					//':variable sind nicht zu übersende Variablen
					return;
				}
				collection = collection.add(self.prefix + value);
			});
		}

		return collection;
	}
}